/**
 * 2Bit Video Processor
 *
 * This is a small script to convert a
 * video image sequence into a raw data file
 * for use with 2bit displays such as FlipDots.
 * https://github.com/owenmcateer/FlipDots
 *
 * Outputted files are uncompressed RAW data so they
 * can be send directly to these 2bit displays
 * using Cast Canvas:
 * https://github.com/owenmcateer/canvas-cast
 * Even short, small videos can result in large
 * data files so be warned.
 *
 * Usage: 2bitVideoProcessor.js [options]
 *
 * Example: 2bitVideoProcessor.js -d seq -o MyVideo
 *
 * Options:
 *   -d, --dir             Directory image sequence
 *   -f, --format [value]  Image sequence file format (defaults to "png")
 *   -h, --help            Output usage information
 *   -o, --output          Output file name
 *   -r, --rotate <n>      Rotate video (defaults to 0)
 *   -t, --threshold <n>   Black/white threshold range[0-255] (defaults to 127)
 *   -v, --version         Output the version number
 */
const args = require('args');
const fs = require('fs');
const { Image } = require('image-js');
const { exit } = require('process');
const naturalSort = require('natural-sort');


// Setup arguments
args
  .option('dir', 'Directory image sequence')
  .option('output', 'Output file name')
  .option('rotate', 'Rotate video', 0)
  .option('format', 'Image sequence file format', 'png')
  .option('threshold', 'Black/white threshold range[0-255]', 127);
const flags = args.parse(process.argv)

// Check arguments
if (!flags.dir) {
  console.error('Image sequence directory is required. -d');
  process.exit();
}
if (!flags.output) {
  console.error('Output file name is required. -o');
  process.exit();
}


// Lets go!
console.log('Welcome!');
execute().catch(console.error);

async function execute() {
  // Find all files
  let imageSeq = fs.readdirSync(flags.dir);
  // Filter image file types
  imageSeq = imageSeq.filter((file) => file.endsWith(flags.format));
  // Sort image sequence
  imageSeq.sort(naturalSort());

  // Images found?
  if (imageSeq.length < 1) {
    console.error('No image found? Check sequence image directory.');
    process.exit();
  }

  // Output video data
  const videoData = [];

  // Load and process each image
  for (const filename of imageSeq) {
    // Load image from disk
    let image = await Image.load(`${flags.dir}/${filename}`);

    // Rotate image
    image = image.rotate(flags.rotate);

    // Process frame
    const frameOutput = [];
    for (let i = 0; i < image.width * image.height * image.channels; i += image.channels) {
      // Single channel image
      let pixel = image.data[i];

      // Multichannel image (RGB/RGBA)
      if (image.channels > 1) {
        pixel = (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3;
      }

      // Threshold break
      frameOutput.push(pixel < flags.threshold ? 0 : 1);
    }

    // Verbose output
    for (let y = 0; y < image.height; y++) {
      let verboseLine = '';
      for (let x = 0; x < image.width; x++) {
        const index = y * image.width + x;
        verboseLine = verboseLine + (frameOutput[index] ? '  ' : '##');
      }
      console.log(verboseLine);
    }
    console.log('');

    // Append processed frame
    videoData.push(frameOutput);
  }

  // Save completed video
  console.log('Finished!');
  fs.writeFile(
    `${flags.output}.json`,
    JSON.stringify(videoData),
    'utf8',
    () => console.log(`File saved as "${flags.output}.json"`)
  );
}
