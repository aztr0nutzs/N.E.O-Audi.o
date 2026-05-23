async function poll() {
  const res = await fetch('http://localhost:3000/api/download-jobs');
  const jobs = await res.json();
  console.log("Current jobs:");
  for (const j of jobs) {
    console.log(`- ${j.id}: ${j.status} | Phase: ${j.phase} | Prog: ${j.progress} | Error: ${j.error}`);
  }
}
poll();
