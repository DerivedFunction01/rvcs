async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/catalog");
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Response text start:", text.substring(0, 1000));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

main();
