import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExportRequest, ExportResponse, ExportFormat } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Export utilities
function formatAsMarkdown(data: any): string {
  let markdown = '';
  
  if (data.title) {
    markdown += `# ${data.title}\n\n`;
  }
  
  if (data.metadata?.document_titles?.length) {
    markdown += `## Source Documents\n\n`;
    data.metadata.document_titles.forEach((title: string, index: number) => {
      markdown += `${index + 1}. ${title}\n`;
    });
    markdown += '\n';
  }
  
  if (data.content) {
    markdown += `## Content\n\n${data.content}\n\n`;
  }
  
  if (data.key_points?.length) {
    markdown += `## Key Points\n\n`;
    data.key_points.forEach((point: string, index: number) => {
      markdown += `${index + 1}. ${point}\n`;
    });
    markdown += '\n';
  }
  
  if (data.metadata?.connections?.length) {
    markdown += `## Document Connections\n\n`;
    data.metadata.connections.forEach((conn: any, index: number) => {
      markdown += `${index + 1}. **${conn.doc1}** ↔ **${conn.doc2}**: ${conn.relationship}\n`;
    });
    markdown += '\n';
  }
  
  if (data.created_at) {
    markdown += `---\n*Generated on: ${new Date(data.created_at).toLocaleDateString()}*\n`;
  }
  
  return markdown;
}

function formatAsPlainText(data: any): string {
  let text = '';
  
  if (data.title) {
    text += `${data.title}\n${'='.repeat(data.title.length)}\n\n`;
  }
  
  if (data.metadata?.document_titles?.length) {
    text += `SOURCE DOCUMENTS:\n`;
    data.metadata.document_titles.forEach((title: string, index: number) => {
      text += `${index + 1}. ${title}\n`;
    });
    text += '\n';
  }
  
  if (data.content) {
    text += `CONTENT:\n${data.content}\n\n`;
  }
  
  if (data.key_points?.length) {
    text += `KEY POINTS:\n`;
    data.key_points.forEach((point: string, index: number) => {
      text += `${index + 1}. ${point}\n`;
    });
    text += '\n';
  }
  
  if (data.metadata?.connections?.length) {
    text += `DOCUMENT CONNECTIONS:\n`;
    data.metadata.connections.forEach((conn: any, index: number) => {
      text += `${index + 1}. ${conn.doc1} <-> ${conn.doc2}: ${conn.relationship}\n`;
    });
    text += '\n';
  }
  
  if (data.created_at) {
    text += `Generated on: ${new Date(data.created_at).toLocaleDateString()}\n`;
  }
  
  return text;
}

function formatAsJSON(data: any): string {
  const exportData = {
    title: data.title,
    content: data.content,
    keyPoints: data.key_points || [],
    language: data.language,
    summaryType: data.summary_type,
    wordCount: data.word_count,
    sourceDocuments: data.metadata?.document_titles || [],
    connections: data.metadata?.connections || [],
    metadata: {
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      processingStatus: data.processing_status,
      analysisType: data.metadata?.analysis_type
    }
  };
  
  return JSON.stringify(exportData, null, 2);
}

function formatAsCSV(data: any): string {
  const rows = [];
  
  // Header
  rows.push('Type,Content,Created At');
  
  // Title
  if (data.title) {
    rows.push(`Title,"${data.title.replace(/"/g, '""')}",${data.created_at}`);
  }
  
  // Content
  if (data.content) {
    const cleanContent = data.content.replace(/"/g, '""').replace(/\n/g, ' ');
    rows.push(`Content,"${cleanContent}",${data.created_at}`);
  }
  
  // Key Points
  if (data.key_points?.length) {
    data.key_points.forEach((point: string) => {
      const cleanPoint = point.replace(/"/g, '""').replace(/\n/g, ' ');
      rows.push(`Key Point,"${cleanPoint}",${data.created_at}`);
    });
  }
  
  return rows.join('\n');
}

function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    default:
      return 'text/plain';
  }
}

function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'md';
    case 'txt':
      return 'txt';
    case 'json':
      return 'json';
    case 'csv':
      return 'csv';
    default:
      return 'txt';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { 
      summaryIds, 
      format = 'markdown', 
      userId, 
      includeMetadata = true,
      filename 
    } = body;

    if (!summaryIds?.length || !userId) {
      return NextResponse.json(
        { error: 'Summary IDs and user ID are required' },
        { status: 400 }
      );
    }

    // Fetch summaries/analyses
    const { data: summaries, error: summariesError } = await supabase
      .from('summaries')
      .select('*')
      .in('id', summaryIds)
      .eq('user_id', userId);

    if (summariesError || !summaries?.length) {
      return NextResponse.json(
        { error: 'Failed to fetch summaries or no summaries found' },
        { status: 404 }
      );
    }

    // Format content based on requested format
    let exportContent = '';
    
    if (summaries.length === 1) {
      // Single summary export
      const summary = summaries[0];
      
      switch (format) {
        case 'markdown':
          exportContent = formatAsMarkdown(summary);
          break;
        case 'txt':
          exportContent = formatAsPlainText(summary);
          break;
        case 'json':
          exportContent = formatAsJSON(summary);
          break;
        case 'csv':
          exportContent = formatAsCSV(summary);
          break;
        default:
          exportContent = formatAsPlainText(summary);
      }
    } else {
      // Multiple summaries export
      if (format === 'json') {
        const exportData = summaries.map(summary => JSON.parse(formatAsJSON(summary)));
        exportContent = JSON.stringify(exportData, null, 2);
      } else if (format === 'csv') {
        const headers = 'Summary ID,Type,Content,Created At';
        const rows = summaries.map(summary => {
          const cleanContent = (summary.content || '').replace(/"/g, '""').replace(/\n/g, ' ');
          return `${summary.id},${summary.summary_type},"${cleanContent}",${summary.created_at}`;
        });
        exportContent = [headers, ...rows].join('\n');
      } else {
        // Markdown or text format for multiple summaries
        exportContent = summaries.map((summary, index) => {
          const separator = format === 'markdown' ? '\n---\n\n' : '\n' + '='.repeat(50) + '\n\n';
          const content = format === 'markdown' ? formatAsMarkdown(summary) : formatAsPlainText(summary);
          return index === 0 ? content : separator + content;
        }).join('');
      }
    }

    // Generate filename if not provided
    const defaultFilename = summaries.length === 1 
      ? `${summaries[0].metadata?.title || 'summary'}.${getFileExtension(format)}`
      : `summaries_export_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
    
    const finalFilename = filename || defaultFilename;

    // Create response with file download
    const response = new NextResponse(exportContent, {
      status: 200,
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Content-Length': Buffer.byteLength(exportContent, 'utf8').toString()
      }
    });

    return response;

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const summaryId = searchParams.get('summaryId');
    const format = (searchParams.get('format') as ExportFormat) || 'markdown';

    if (!userId || !summaryId) {
      return NextResponse.json(
        { error: 'User ID and Summary ID are required' },
        { status: 400 }
      );
    }

    // Fetch single summary
    const { data: summary, error: summaryError } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', summaryId)
      .eq('user_id', userId)
      .single();

    if (summaryError || !summary) {
      return NextResponse.json(
        { error: 'Summary not found' },
        { status: 404 }
      );
    }

    // Format content
    let exportContent = '';
    
    switch (format) {
      case 'markdown':
        exportContent = formatAsMarkdown(summary);
        break;
      case 'txt':
        exportContent = formatAsPlainText(summary);
        break;
      case 'json':
        exportContent = formatAsJSON(summary);
        break;
      case 'csv':
        exportContent = formatAsCSV(summary);
        break;
      default:
        exportContent = formatAsPlainText(summary);
    }

    const filename = `${summary.metadata?.title || 'summary'}.${getFileExtension(format)}`;

    return new NextResponse(exportContent, {
      status: 200,
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(exportContent, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}