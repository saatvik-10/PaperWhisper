import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { downloadFromS3 } from './s3-server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import {
  Document,
  RecursiveCharacterTextSplitter,
} from '@pinecone-database/doc-splitter';
import { getEmbeddings } from './embeddings';
import md5 from 'md5';
import { convertToAscii } from './utils';

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: {
      pageNumber: number;
    };
  };
};

export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

export async function loadS3ToPinecone(fileKey: string) {
  //get the pdf from s3
  console.log('downlaoding s3 file into the system');
  const file_name = await downloadFromS3(fileKey);

  if (!file_name) {
    throw new Error('Error in downloading file from s3');
  }

  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  //splitting the pdf into pages
  const documents = await Promise.all(pages.map(prepareDocument));

  //vector and embed the docs
  const vectors = await Promise.all(documents.flat().map(embedDocument));

  //uploading to pinecone db
  const client = await getPineconeClient();
  const pineconeIndex = await client.index('paper-whisper');
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

  console.log('inserting vectors into pinecone');

  await namespace.upsert(vectors);

  return documents[0];
}

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, ''); //regex to remove new lines with empty string

  //split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        loc: {
          pageNumber: metadata.loc.pageNumber,
          text: TruncateStringByBytes(pageContent, 36000),
        },
      },
    }),
  ]);
  return docs;
}

async function embedDocument(docs: Document) {
  try {
    const embeddings = await getEmbeddings(docs.pageContent);
    const hash = md5(docs.pageContent);

    return {
      //returning a vector type
      id: hash,
      values: embeddings,
      metadata: {
        text: docs.metadata.text,
        pageNumber: docs.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (err) {
    console.log('error in embedding the document', err);
    throw err;
  }
}

export const TruncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder('utf-8').decode(enc.encode(str).slice(0, bytes));
};
