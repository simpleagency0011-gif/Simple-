const sharp = require('C:/Users/sajan/AppData/Local/OpenAI/Codex/runtimes/cua_node/3dd31cfff853001c/bin/node_modules/sharp');
const path = require('path');

const UPLOAD_DIR = 'C:/Users/sajan/.gemini/antigravity/brain/88929d95-ff5d-4c1d-8210-ca27d6514c9f/.user_uploaded';

async function extractPhotos() {
  console.log('Extracting photos from Canva slides...');

  // 1. Slide 1 (Hero Laptop Photo)
  // media_1791650232317_ec8d937e.png
  const s1Meta = await sharp(path.join(UPLOAD_DIR, 'media_1791650232317_ec8d937e.png')).metadata();
  console.log('Slide 1 dimensions:', s1Meta.width, 'x', s1Meta.height);

  // In Slide 1, the laptop photo is on the left side: roughly x: 5% to 48%, y: 15% to 90%
  // Let's crop the photo precisely
  await sharp(path.join(UPLOAD_DIR, 'media_1791650232317_ec8d937e.png'))
    .extract({
      left: Math.round(s1Meta.width * 0.055),
      top: Math.round(s1Meta.height * 0.17),
      width: Math.round(s1Meta.width * 0.425),
      height: Math.round(s1Meta.height * 0.73)
    })
    .jpeg({ quality: 95 })
    .toFile('hero-workstation.jpg');
  console.log('✓ hero-workstation.jpg saved');

  // 2. Slide 2 (Full background)
  // media_1791650231831_a2661953.jpg
  await sharp(path.join(UPLOAD_DIR, 'media_1791650231831_a2661953.jpg'))
    .jpeg({ quality: 95 })
    .toFile('overview-ambient-bg.jpg');
  console.log('✓ overview-ambient-bg.jpg saved');

  // 3. Slide 3 (Solutions Collaboration Photo)
  // media_1791650232027_6dc4d43c.png
  const s3Meta = await sharp(path.join(UPLOAD_DIR, 'media_1791650232027_6dc4d43c.png')).metadata();
  console.log('Slide 3 dimensions:', s3Meta.width, 'x', s3Meta.height);
  // In Slide 3, photo is on the right side: roughly x: 49% to 94.5%, y: 17% to 70%
  await sharp(path.join(UPLOAD_DIR, 'media_1791650232027_6dc4d43c.png'))
    .extract({
      left: Math.round(s3Meta.width * 0.49),
      top: Math.round(s3Meta.height * 0.17),
      width: Math.round(s3Meta.width * 0.455),
      height: Math.round(s3Meta.height * 0.525)
    })
    .jpeg({ quality: 95 })
    .toFile('solutions-collaboration.jpg');
  console.log('✓ solutions-collaboration.jpg saved');

  // 4. Slide 4 (Featured Work: 3 photos)
  // media_1791650232047_0d35874d.png
  const s4Meta = await sharp(path.join(UPLOAD_DIR, 'media_1791650232047_0d35874d.png')).metadata();
  console.log('Slide 4 dimensions:', s4Meta.width, 'x', s4Meta.height);
  // Y range: roughly 52% to 90%
  const cardY = Math.round(s4Meta.height * 0.525);
  const cardH = Math.round(s4Meta.height * 0.375);
  const cardW = Math.round(s4Meta.width * 0.288);

  // Photo 1 (Tablet)
  await sharp(path.join(UPLOAD_DIR, 'media_1791650232047_0d35874d.png'))
    .extract({
      left: Math.round(s4Meta.width * 0.055),
      top: cardY,
      width: cardW,
      height: cardH
    })
    .jpeg({ quality: 95 })
    .toFile('work-1-tablet.jpg');

  // Photo 2 (Charts / Finance)
  await sharp(path.join(UPLOAD_DIR, 'media_1791650232047_0d35874d.png'))
    .extract({
      left: Math.round(s4Meta.width * 0.355),
      top: cardY,
      width: cardW,
      height: cardH
    })
    .jpeg({ quality: 95 })
    .toFile('work-2-charts.jpg');

  // Photo 3 (Mobile / Entrepreneur)
  await sharp(path.join(UPLOAD_DIR, 'media_1791650232047_0d35874d.png'))
    .extract({
      left: Math.round(s4Meta.width * 0.655),
      top: cardY,
      width: cardW,
      height: cardH
    })
    .jpeg({ quality: 95 })
    .toFile('work-3-mobile.jpg');
  console.log('✓ work-1, work-2, work-3 saved');

  // 5. Slide 6 (Testimonials: Avatars)
  // media_1791650248985_56b01457.png
  const s6Meta = await sharp(path.join(UPLOAD_DIR, 'media_1791650248985_56b01457.png')).metadata();
  console.log('Slide 6 dimensions:', s6Meta.width, 'x', s6Meta.height);
  const avatarY = Math.round(s6Meta.height * 0.74);
  const avatarSize = Math.round(s6Meta.width * 0.05);

  await sharp(path.join(UPLOAD_DIR, 'media_1791650248985_56b01457.png'))
    .extract({
      left: Math.round(s6Meta.width * 0.095),
      top: avatarY,
      width: avatarSize,
      height: avatarSize
    })
    .jpeg({ quality: 95 })
    .toFile('avatar-1.jpg');

  await sharp(path.join(UPLOAD_DIR, 'media_1791650248985_56b01457.png'))
    .extract({
      left: Math.round(s6Meta.width * 0.395),
      top: avatarY,
      width: avatarSize,
      height: avatarSize
    })
    .jpeg({ quality: 95 })
    .toFile('avatar-2.jpg');

  await sharp(path.join(UPLOAD_DIR, 'media_1791650248985_56b01457.png'))
    .extract({
      left: Math.round(s6Meta.width * 0.695),
      top: avatarY,
      width: avatarSize,
      height: avatarSize
    })
    .jpeg({ quality: 95 })
    .toFile('avatar-3.jpg');
  console.log('✓ avatar-1, avatar-2, avatar-3 saved');

  // 6. Slide 7 (Work with us - Analytics monitor)
  // media_1791650258392_dee1ba06.png
  const s7Meta = await sharp(path.join(UPLOAD_DIR, 'media_1791650258392_dee1ba06.png')).metadata();
  console.log('Slide 7 dimensions:', s7Meta.width, 'x', s7Meta.height);
  await sharp(path.join(UPLOAD_DIR, 'media_1791650258392_dee1ba06.png'))
    .extract({
      left: Math.round(s7Meta.width * 0.49),
      top: Math.round(s7Meta.height * 0.17),
      width: Math.round(s7Meta.width * 0.455),
      height: Math.round(s7Meta.height * 0.73)
    })
    .jpeg({ quality: 95 })
    .toFile('contact-analytics.jpg');
  console.log('✓ contact-analytics.jpg saved');

  console.log('🎉 All high-resolution photos successfully extracted and saved!');
}

extractPhotos().catch(err => console.error(err));
