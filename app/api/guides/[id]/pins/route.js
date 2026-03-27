import { NextResponse } from 'next/server';
import { dbHelpers } from '../../../../../lib/supabase';
import { uploadToR2, isR2Configured } from '../../../../../lib/cloudflare-r2';

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
 * GET /api/guides/[id]/pins - Get all pins for a guide
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    // Fetch guide to verify it exists and check access
    const guide = await dbHelpers.getGuideById(id);

    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Check access: owner or public guide
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    const isOwner = userId && userEmail && guide.user_id === userId && guide.user_email === userEmail;
    
    if (!guide.is_public && !isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this guide' },
        { status: 403 }
      );
    }

    // Fetch pins
    const pins = await dbHelpers.getGuidePins(id);

    // Normalize pins to match frontend format
    const normalizedPins = pins.map(pin => ({
      id: pin.id,
      name: pin.name,
      address: pin.address,
      coordinates: pin.coordinates,
      placeId: pin.place_id,
      description: pin.description,
      pinLinkUrl: pin.pin_link_url,
      pinImageUrl: pin.pin_image_url,
      pinImageFilename: pin.pin_image_filename,
      displayOrder: pin.display_order
    }));

    return NextResponse.json({ pins: normalizedPins });

  } catch (error) {
    console.error('Get guide pins error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guide pins', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/guides/[id]/pins - Create a new pin for a guide
 */
export async function POST(req, { params }) {
  try {
    const { id } = await params;
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

    if (!pinData || !pinData.name || !pinData.coordinates) {
      return NextResponse.json(
        { error: 'Pin name and coordinates are required' },
        { status: 400 }
      );
    }
    if (pinData.pinLinkUrl && !normalizePinLinkUrl(pinData.pinLinkUrl)) {
      return NextResponse.json(
        { error: 'Invalid link URL. Please use a valid http or https URL.' },
        { status: 400 }
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

    // Upload image if provided
    let pinImageUrl = null;
    let pinImageFilename = null;

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
        pinImageUrl = uploadResult.url;
        pinImageFilename = filename;
      } else {
        return NextResponse.json(
          { error: 'Failed to upload image', details: uploadResult.error },
          { status: 500 }
        );
      }
    }

    // Get next display order
    const existingPins = await dbHelpers.getGuidePins(id);
    const maxOrder = existingPins.length > 0 
      ? Math.max(...existingPins.map(p => p.display_order || 0))
      : -1;
    const displayOrder = maxOrder + 1;

    // Create pin
    const pin = await dbHelpers.createGuidePin({
      guide_id: id,
      name: pinData.name,
      address: pinData.address || null,
      coordinates: pinData.coordinates,
      place_id: pinData.placeId || null,
      description: pinData.description || null,
      pin_link_url: normalizePinLinkUrl(pinData.pinLinkUrl),
      pin_image_url: pinImageUrl,
      pin_image_filename: pinImageFilename,
      display_order: displayOrder
    });

    // Recalculate guide center to include new pin
    const calculatedCoordinates = await dbHelpers.calculateGuideCenter(id);
    if (calculatedCoordinates) {
      await dbHelpers.updateGuide(id, { coordinates: calculatedCoordinates });
    }

    return NextResponse.json({
      success: true,
      pin: {
        id: pin.id,
        name: pin.name,
        address: pin.address,
        coordinates: pin.coordinates,
        placeId: pin.place_id,
        description: pin.description,
        pinLinkUrl: pin.pin_link_url,
        pinImageUrl: pin.pin_image_url,
        pinImageFilename: pin.pin_image_filename,
        displayOrder: pin.display_order
      }
    });

  } catch (error) {
    console.error('Create guide pin error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to create guide pin', details: error.message, fullError: error.toString() },
      { status: 500 }
    );
  }
}

