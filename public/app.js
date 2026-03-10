function renderAnalyze(data) {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";

  const rows = [
    ["Goal Clarity", data.goal_clarity, ""],
    ["Context Depth", data.context_depth, ""],
    ["Constraint Definition", data.constraint_definition, ""],
    ["Output Specification", data.output_specification, ""],
    ["Ambiguity Risk", data.ambiguity_risk, ""],
    ["Diagnosis", "", data.diagnosis],
  ];

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell ?? "";
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  document.getElementById("total").textContent =
    data.total_score ?? "-";

  document.getElementById("raw").textContent =
    JSON.stringify(data, null, 2);
}

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("prompt").value;

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!data.success) {
      alert("AI analyze error");
      return;
    }

    renderAnalyze(data.result);
  } catch (err) {
    console.error(err);
    alert("Analyze request failed");
  }
});

document.getElementById("optimizeBtn").addEventListener("click", async () => {

  const prompt = document.getElementById("prompt").value;

  try {

    const res = await fetch("/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    console.log("OPTIMIZE RESPONSE:", data);

    if (!data.success) {
      alert("AI optimize error");
      return;
    }

    const aiResult = data.result || {};

    const improved =
      aiResult.improved_prompt ||
      aiResult.prompt ||
      "개선된 프롬프트 없음";

    const changes =
      Array.isArray(aiResult.changes)
        ? aiResult.changes
        : [];

    const box = document.getElementById("optimized");

    if (!box) {
      console.error("optimized element not found");
      return;
    }

    box.textContent =
      "개선된 프롬프트:\n\n" +
      improved +
      "\n\n변경 이유:\n" +
      (changes.length ? changes.join("\n") : "변경 이유 없음");

  } catch (err) {

    console.error("OPTIMIZE ERROR:", err);
    alert("Optimize request failed");

  }

});