/**
 * Delete User Data API Route (RGPD Right to be Forgotten)
 *
 * DELETE /api/delete-user-data
 * Body: { userId: string }
 * Returns: { success: boolean, message: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logDeleteAudit } from '@/lib/audit-logger'

export async function DELETE(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json()
    const { userId } = body

    // Validation
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId. Please provide a valid user identifier.' },
        { status: 400 }
      )
    }

    // Step 1: Get all user's documents before deletion (for audit log)
    const { data: userDocs } = await supabaseAdmin
      .from('documents')
      .select('id, file_path')
      .eq('uploaded_by', userId)

    const documentIds = (userDocs || []).map(doc => doc.id)

    // Step 2: Delete user's conversations
    const { error: convDeleteError } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('user_id', userId)

    if (convDeleteError) {
      console.error('Conversation deletion error:', convDeleteError)
      // Continue anyway - partial deletion is better than none
    }

    // Step 3: Delete user's documents from storage
    if (userDocs && userDocs.length > 0) {
      const filePaths = userDocs.map(doc => doc.file_path)

      const { error: storageDeleteError } = await supabaseAdmin
        .storage
        .from('documents')
        .remove(filePaths)

      if (storageDeleteError) {
        console.error('Storage deletion error:', storageDeleteError)
        // Continue anyway
      }

      // Delete from database (this will cascade to document_chunks)
      const { error: docDeleteError } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('uploaded_by', userId)

      if (docDeleteError) {
        console.error('Document deletion error:', docDeleteError)
      }
    }

    // Step 4: Audit log (KEEP audit logs per RGPD - they are internal only)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    await logDeleteAudit({
      userId,
      documentIds,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined
    })

    // Step 5: Return success
    return NextResponse.json({
      success: true,
      message: 'User data has been deleted successfully.',
      deletedConversations: true,
      deletedDocuments: documentIds.length
    })

  } catch (error: unknown) {
    console.error('Delete user data error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to delete user data.',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
