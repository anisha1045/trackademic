const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { extractFromSyllabus } = require('./openai');
const { insertAssignment } = require('./database');

// Get the filename from the command line
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path as an argument.');
  console.error('Example: node extract.js syllabus.pdf');
  process.exit(1);
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;

  } else if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');

  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;

  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function main() {
  try {
    console.log(`Reading and parsing file: ${filePath}`);
    const text = await extractText(filePath);
    console.log('Extracted text preview:', text.slice(0, 500));

    const result = await extractFromSyllabus(text);

    if (!result || !Array.isArray(result.assignments)) {
      console.error('No valid assignments returned from OpenAI.');
      console.log('Full response:', result);
      return;
    }

    console.log(`Found ${result.assignments.length} assignments.`);
    for (const assignment of result.assignments) {
      insertAssignment(assignment.name, assignment.due_date, assignment.tasks || []);
    }

    console.log('Finished processing and storing assignments.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
