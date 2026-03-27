import { NextResponse } from 'next/server';
import { dbHelpers } from '../../../../../../lib/supabase';
import { uploadToR2, isR2Configured } from '../../../../../../lib/cloudflare-r2';

const normalizePinLinkUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

/**
 * PUT /api/guides/[id]/pins/[pinId] - Update a pin
 */
export async function PUT(req, { params }) {
  try {
    const { id, pinId } = await params;
    const formData = await req.formData();

    const user = JSON.parse(formData.get('user') || '{}');
    const pinData = JSON.parse(formData.get('pinData') || '{}');
    const imageFile = formData.get('imageFile');

    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Fetch guide to verify ownership
    const guide = await dbHelpers.getGuideById(id);

    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (guide.user_id !== user.id || guide.user_email !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this guide' },
        { status: 403 }
      );
    }

    // Fetch existing pin
    const existingPin = await dbHelpers.getGuidePinById(pinId);

    if (!existingPin || existingPin.guide_id !== id) {
      return NextResponse.json(
        { error: 'Pin not found' },
        { status: 404 }
      );
    }

    // Prepare updates
    const updates = {};
    if (pinData.name !== undefined) updates.name = pinData.name;
    if (pinData.address !== undefined) updates.address = pinData.address;
    if (pinData.coordinates !== undefined) updates.coordinates = pinData.coordinates;
    if (pinData.placeId !== undefined) updates.place_id = pinData.placeId;
    if (pinData.description !== undefined) updates.description = pinData.description;
    if (pinData.displayOrder !== undefined) updates.display_order = pinData.displayOrder;
    if (pinData.pinLinkUrl !== undefined) {
      if (pinData.pinLinkUrl && !normalizePinLinkUrl(pinData.pinLinkUrl)) {
        return NextResponse.json(
          { error: 'Invalid link URL. Please use a valid http or https URL.' },
          { status: 400 }
        );
      }
      updates.pin_link_url = normalizePinLinkUrl(pinData.pinLinkUrl);
    }

    // Upload new image if provided
    if (imageFile && imageFile instanceof File) {
      if (!isR2Configured()) {
        return NextResponse.json(
          { error: 'Image storage not configured' },
          { status: 500 }
        );
      }

      const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
      const fileExt = imageFile.name.split('.').pop().toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      
      if (!allowedExtensions.includes(fileExt)) {
        return NextResponse.json(
          { error: 'Invalid image format. Allowed: jpg, png, webp, gif' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `guide-pins/${user.id}/${id}/${timestamp}.${fileExt}`;

      // Upload to R2
      const uploadResult = await uploadToR2(filename, fileBuffer, imageFile.type);
      
      if (uploadResult.success) {
        updates.pin_image_url = uploadResult.url;
        updates.pin_image_filename = filename;
      } else {
        return NextResponse.json(
          { error: 'Failed to upload image', details: uploadResult.error },
          { status: 500 }
        );
      }
    }

    // Update pin
    const updatedPin = await dbHelpers.updateGuidePin(pinId, updates);

    // Recalculate guide center
    const calculatedCoordinates = await dbHelpers.calculateGuideCenter(id);
    if (calculatedCoordinates) {
      await dbHelpers.updateGuide(id, { coordinates: calculatedCoordinates });
    }

    return NextResponse.json({
      success: true,
      pin: {
        id: updatedPin.id,
        name: updatedPin.name,
        address: updatedPin.address,
        coordinates: updatedPin.coordinates,
        placeId: updatedPin.place_id,
        description: updatedPin.description,
        pinLinkUrl: updatedPin.pin_link_url,
        pinImageUrl: updatedPin.pin_image_url,
        pinImageFilename: updatedPin.pin_image_filename,
        displayOrder: updatedPin.display_order
      }
    });

  } catch (error) {
    console.error('Update guide pin error:', error);
    return NextResponse.json(
      { error: 'Failed to update guide pin', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/guides/[id]/pins/[pinId] - Delete a pin
 */
export async function DELETE(req, { params }) {
  try {
    const { id, pinId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Fetch guide to verify ownership
    const guide = await dbHelpers.getGuideById(id);

    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (guide.user_id !== userId || guide.user_email !== userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this guide' },
        { status: 403 }
      );
    }

    // Fetch existing pin
    const existingPin = await dbHelpers.getGuidePinById(pinId);

    if (!existingPin || existingPin.guide_id !== id) {
      return NextResponse.json(
        { error: 'Pin not found' },
        { status: 404 }
      );
    }

    // Delete pin
    await dbHelpers.deleteGuidePin(pinId);

    // Recalculate guide center
    const calculatedCoordinates = await dbHelpers.calculateGuideCenter(id);
    if (calculatedCoordinates) {
      await dbHelpers.updateGuide(id, { coordinates: calculatedCoordinates });
    }

    return NextResponse.json({
      success: true,
      message: 'Pin deleted successfully'
    });

  } catch (error) {
    console.error('Delete guide pin error:', error);
    return NextResponse.json(
      { error: 'Failed to delete guide pin', details: error.message },
      { status: 500 }
    );
  }
}

