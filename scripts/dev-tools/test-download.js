async function test() {
  const res = await fetch('http://localhost:3000/api/download-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg', format: 'mp3', bitrate: 128 })
  });
  console.log(await res.json());
}

test();
