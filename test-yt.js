const youtubedl = require('youtube-dl-exec');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
console.log('ffmpeg path:', ffmpegInstaller.path);
youtubedl('https://www.youtube.com/watch?v=BaW_jenozKc', {
  dumpSingleJson: true,
  noWarnings: true,
  noCheckCertificate: true
}).then(output => {
  console.log("Success title:", output.title);
}).catch(console.error);