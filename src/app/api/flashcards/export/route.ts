import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'

interface Flashcard {
  question: string
  answer: string
}

interface ExportRequest {
  flashcards: Flashcard[]
  topic: string
  format: 'pdf' | 'csv' | 'anki'
}

// Generate CSV content
function generateCSV(flashcards: Flashcard[], topic: string): string {
  const headers = ['Question', 'Answer']
  const rows = flashcards.map(card => [
    `"${card.question.replace(/"/g, '""')}"`,
    `"${card.answer.replace(/"/g, '""')}"`
  ])
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

// Generate Anki-compatible text format
function generateAnki(flashcards: Flashcard[], topic: string): string {
  // Anki format: Question\tAnswer\tTags
  const ankiCards = flashcards.map(card => {
    const question = card.question.replace(/\t/g, ' ').replace(/\n/g, ' ')
    const answer = card.answer.replace(/\t/g, ' ').replace(/\n/g, ' ')
    const tag = topic.replace(/\s+/g, '_').toLowerCase()
    return `${question}\t${answer}\t${tag}`
  })
  
  return ankiCards.join('\n')
}

// Generate PDF using jsPDF
function generatePDF(flashcards: Flashcard[], topic: string): Buffer {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  let yPosition = margin
  
  // Add title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(`Flashcards: ${topic}`, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15
  
  // Add metadata
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10
  doc.text(`Total Cards: ${flashcards.length}`, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 20
  
  // Add flashcards
  flashcards.forEach((card, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage()
      yPosition = margin
    }
    
    // Card number
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.text(`Card ${index + 1}`, margin, yPosition)
    yPosition += 10
    
    // Question
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235) // Blue color
    const questionLines = doc.splitTextToSize(`Q: ${card.question}`, maxWidth)
    doc.text(questionLines, margin, yPosition)
    yPosition += questionLines.length * 7 + 5
    
    // Answer
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81) // Gray color
    const answerLines = doc.splitTextToSize(`A: ${card.answer}`, maxWidth - 20)
    doc.text(answerLines, margin + 20, yPosition)
    yPosition += answerLines.length * 6 + 15
    
    // Add a separator line
    if (index < flashcards.length - 1) {
      doc.setDrawColor(221, 221, 221)
      doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5)
      yPosition += 5
    }
  })
  
  return Buffer.from(doc.output('arraybuffer'))
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json()
    const { flashcards, topic, format } = body
    
    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return NextResponse.json(
        { error: 'Flashcards are required' },
        { status: 400 }
      )
    }
    
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }
    
    if (!format || !['pdf', 'csv', 'anki'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be pdf, csv, or anki' },
        { status: 400 }
      )
    }
    
    let content: string
    let contentType: string
    let filename: string
    
    const sanitizedTopic = topic.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-')
    
    switch (format) {
      case 'csv':
        content = generateCSV(flashcards, topic)
        contentType = 'text/csv'
        filename = `flashcards-${sanitizedTopic}.csv`
        break
        
      case 'anki':
        content = generateAnki(flashcards, topic)
        contentType = 'text/plain'
        filename = `flashcards-${sanitizedTopic}.txt`
        break
        
      case 'pdf':
        const pdfBuffer = generatePDF(flashcards, topic)
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="flashcards-${sanitizedTopic}.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
            'Cache-Control': 'no-cache'
          }
        })
        
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        )
    }
    
    const response = new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
    return response
    
  } catch (error) {
    console.error('Error in flashcard export:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}