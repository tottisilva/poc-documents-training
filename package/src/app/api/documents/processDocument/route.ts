import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import { spawn } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Disable body parsing for formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormidableFiles {
  file: File;
}

const runPythonScript = (filePath: string): Promise<{ summary: string, tags: string[] }> => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['path/to/process_document.py', filePath]);

    let data = '';
    pythonProcess.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    pythonProcess.stderr.on('data', (error) => {
      console.error('Python script error:', error.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}`));
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files: formidable.Files) => {
    if (err) {
      console.error('Formidable error:', err);
      return res.status(500).json({ error: 'File upload failed' });
    }

    const file = files.file as unknown as formidable.File;
    const filePath = file.filepath;

    try {
      const result = await runPythonScript(filePath);

      const { tags, summary } = result;

      const newDocument = await prisma.document.create({
        data: {
          title: fields.title as unknown as string,
          description: summary, // Using summary as the description
          fileUrl: fields.fileUrl as unknown as string,
          metadata: JSON.stringify(tags), // Saving tags as metadata
          userId: parseInt(fields.userId as unknown as string, 10),
          functionalAreaId: parseInt(fields.functionalAreaId as unknown as string, 10),
          groupNameId: parseInt(fields.groupNameId as unknown as string, 10),
          createdAt: new Date(),
          updatedAt: new Date(),
          isCheckedOut: false,
        },
      });

      console.log(`Created document in database: ${newDocument.title}`);

      res.status(200).json({ success: true, document: newDocument });
    } catch (error) {
      console.error('Error processing document:', error);
      res.status(500).json({ error: 'Document processing failed' });
    } finally {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
  });
};

export default handler;
