async function waitPoll() {
  for(let i=0; i<15; i++) {
    const res = await fetch('http://localhost:3000/api/download-jobs');
    const jobs = await res.json();
    console.log(`-- Check ${i} --`);
    for (const j of jobs) {
       console.log(`[${j.id}]: ${j.status} | Phase: ${j.phase} | Prog: ${j.progress} | Error: ${j.error}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}
waitPoll();
