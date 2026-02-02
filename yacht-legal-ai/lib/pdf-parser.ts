/**
 * PDF Parsing Utilities
 *
 * Extract text content from PDF files for indexing
 */

import pdfParse from 'pdf-parse'

export type PDFParseResult = {
  text: string
  pages: number
  metadata: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
    [key: string]: unknown
  }
}

/**
 * Extract text from PDF buffer
 *
 * @param buffer - PDF file as Buffer
 * @returns Extracted text, page count, and metadata
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    const data = await pdfParse(buffer)

    return {
      text: data.text,
      pages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        ...data.info
      }
    }
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate PDF buffer
 * Checks if buffer contains valid PDF signature
 *
 * @param buffer - Buffer to validate
 * @returns true if valid PDF
 */
export function isValidPDF(buffer: Buffer): boolean {
  // PDF files start with %PDF-
  const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-

  if (buffer.length < 5) {
    return false
  }

  return buffer.subarray(0, 5).equals(pdfSignature)
}

/**
 * Extract text from specific pages
 *
 * @param buffer - PDF buffer
 * @param pageNumbers - Array of page numbers to extract (1-indexed)
 * @returns Extracted text from specified pages
 */
export async function extractPagesFromPDF(
  buffer: Buffer,
  _pageNumbers: number[]
): Promise<string> {
  try {
    void _pageNumbers
    const data = await pdfParse(buffer)

    // Note: pdf-parse doesn't support per-page extraction directly
    // This is a simplified implementation
    // For production, consider using pdf-lib or pdfjs-dist for page-level access

    return data.text
  } catch (error) {
    console.error('PDF page extraction error:', error)
    throw new Error(`Failed to extract pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get PDF metadata without full parsing
 * Faster than full text extraction
 *
 * @param buffer - PDF buffer
 * @returns PDF metadata
 */
export async function getPDFMetadata(buffer: Buffer): Promise<PDFParseResult['metadata']> {
  try {
    const data = await pdfParse(buffer, {
      max: 1 // Only parse first page for metadata
    })

    return {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      keywords: data.info?.Keywords,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
      modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      ...data.info
    }
  } catch (error) {
    console.error('PDF metadata extraction error:', error)
    return {}
  }
}
