import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import Papa from "papaparse";
import modelsData from "../data/models.json";

export default function TaxonomyTab() {
  const [viewMode, setViewMode] = useState("tree");
  const svgRef = useRef(null);
  const [treeData, setTreeData] = useState(null);
  const [attacksData, setAttacksData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Starting to load CSV...");
    
    // Load and parse CSV file
    fetch("/consolidated_prompt_injection_attacks.csv")
      .then((response) => {
        console.log("CSV fetch response:", response.status);
        if (!response.ok) {
          throw new Error(`Failed to load CSV file (Status: ${response.status})`);
        }
        return response.text();
      })
      .then((csvText) => {
        console.log("CSV loaded, length:", csvText.length);
        console.log("First 200 chars:", csvText.substring(0, 200));
        const parsed = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        console.log("Parsed data:", parsed.data.length, "rows");
        console.log("Sample row:", parsed.data[0]);

        // Group attacks by family
        const familiesMap = new Map();

        parsed.data.forEach((row) => {
          const familyName = row.attack_family;
          if (!familyName) return;
          
          if (!familiesMap.has(familyName)) {
            familiesMap.set(familyName, {
              name: familyName,
              attacks: [],
            });
          }

          familiesMap.get(familyName).attacks.push({
            id: `${familyName}-${row.attack_name}`.replace(/\s+/g, "-"),
            title: row.attack_name,
            description: row.attack_prompt,
            severity: row.severity >= 7 ? "high" : row.severity >= 4 ? "medium" : "low",
            source: row.source_paper,
            severityScore: row.severity,
          });
        });

        const families = Array.from(familiesMap.values());
        console.log("Families created:", families.length);
        console.log("Family names:", families.map(f => f.name));
        
        setAttacksData({ families });

        // Transform data for D3 tree
        const transformedData = {
          name: "LLM Attacks",
          children: families.map((family) => ({
            name: family.name,
            children: family.attacks.map((attack) => ({
              name: attack.title,
              severity: attack.severity,
              description: attack.description,
              children: modelsData.models.map((model) => ({
                name: `${model.name}\n(Defense: ${model.defense_score})`,
                description: model.description,
              })),
            })),
          })),
        };

        setTreeData(transformedData);
      })
      .catch((error) => {
        console.error("Error loading CSV:", error);
        setError(error.message);
      });
  }, []);

  useEffect(() => {
    if (!treeData || viewMode !== "tree") return;

    try {
      // Clear previous SVG content
      d3.select(svgRef.current).selectAll("*").remove();

      const width = 1400;
      const height = 700;

      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height);

      const g = svg.append("g");

      // Add zoom and pan behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);

      // Set initial transform
      const initialTransform = d3.zoomIdentity.translate(width / 2, 50).scale(0.8);
      svg.call(zoom.transform, initialTransform);

      const tree = d3.tree()
        .size([width - 200, height - 200])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

      let i = 0;

      const root = d3.hierarchy(treeData);
      root.x0 = 0;
      root.y0 = 0;

      // Collapse all children initially
      if (root.children) {
        root.children.forEach(collapse);
      }

      function collapse(d) {
        if (d.children) {
          d._children = d.children;
          d._children.forEach(collapse);
          d.children = null;
        }
      }

      update(root);

      function update(source) {
        const treeLayout = tree(root);
        const nodes = treeLayout.descendants();
        const links = treeLayout.descendants().slice(1);

        // Normalize for fixed-depth
        nodes.forEach((d) => {
          d.y = d.depth * 200;
        });

        // Update nodes
        const node = g.selectAll(".node").data(nodes, (d) => d.id || (d.id = ++i));

        // Enter new nodes
        const nodeEnter = node
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", (d) => `translate(${source.x0},${source.y0})`)
          .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
          .on("click", click);

        nodeEnter
          .append("rect")
          .attr("class", "node-rect")
          .attr("width", 160)
          .attr("height", 80)
          .attr("x", -80)
          .attr("y", -40)
          .attr("rx", 5)
          .style("fill", "white")
          .style("stroke", "#4A90E2")
          .style("stroke-width", "2")
          .style("cursor", "move");

        nodeEnter
          .append("text")
          .attr("class", "node-text")
          .style("fill", "black")
          .style("font-size", "10px")
          .style("font-weight", "500")
          .style("text-anchor", "middle")
          .style("pointer-events", "none")
          .each(function(d) {
            const textElement = d3.select(this);
            const name = d.data.name || "";
            const words = name.split(/[\s\n]+/);
            const maxCharsPerLine = 20;
            let currentLine = [];
            let lines = [];

            words.forEach(word => {
              const testLine = [...currentLine, word].join(" ");
              if (testLine.length > maxCharsPerLine && currentLine.length > 0) {
                lines.push(currentLine.join(" "));
                currentLine = [word];
              } else {
                currentLine.push(word);
              }
            });

            if (currentLine.length > 0) {
              lines.push(currentLine.join(" "));
            }

            // Limit to 4 lines
            lines = lines.slice(0, 4);

            lines.forEach((line, i) => {
              textElement.append("tspan")
                .attr("x", 0)
                .attr("dy", i === 0 ? `-${(lines.length - 1) * 0.5}em` : "1.1em")
                .text(line.length > 22 ? line.substring(0, 20) + "..." : line);
            });
          });

        // Update
        const nodeUpdate = nodeEnter.merge(node);

        nodeUpdate
          .transition()
          .duration(750)
          .attr("transform", (d) => `translate(${d.x},${d.y})`);

        nodeUpdate
          .select("rect")
          .on("mouseenter", function () {
            d3.select(this)
              .style("fill", "#f0f7ff")
              .style("stroke-width", "3")
              .style("stroke", "#2196F3");
          })
          .on("mouseleave", function () {
            d3.select(this)
              .style("fill", "white")
              .style("stroke-width", "2")
              .style("stroke", "#4A90E2");
          });

        // Exit
        const nodeExit = node
          .exit()
          .transition()
          .duration(750)
          .attr("transform", (d) => `translate(${source.x},${source.y})`)
          .remove();

        // Update links
        const link = g.selectAll(".link").data(links, (d) => d.id);

        const linkEnter = link
          .enter()
          .insert("path", "g")
          .attr("class", "link")
          .attr("d", (d) => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
          })
          .style("fill", "none")
          .style("stroke", "#999")
          .style("stroke-width", "2");

        const linkUpdate = linkEnter.merge(link);

        linkUpdate
          .transition()
          .duration(750)
          .attr("d", (d) => diagonal(d, d.parent));

        link
          .exit()
          .transition()
          .duration(750)
          .attr("d", (d) => {
            const o = { x: source.x, y: source.y };
            return diagonal(o, o);
          })
          .remove();

        nodes.forEach((d) => {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }

      function click(event, d) {
        // Prevent drag from triggering click
        if (event.defaultPrevented) return;
        
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(d);
      }

      function dragstarted(event, d) {
        d3.select(this).raise();
        event.sourceEvent.stopPropagation();
      }

      function dragged(event, d) {
        // Calculate the offset
        const dx = event.x - d.x;
        const dy = event.y - d.y;
        
        // Update position of dragged node
        d.x = event.x;
        d.y = event.y;
        
        // Move the node
        d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
        
        // Update all descendant positions
        if (d.descendants) {
          d.descendants().forEach(descendant => {
            if (descendant !== d) {
              descendant.x += dx;
              descendant.y += dy;
              
              // Update descendant visual position
              g.selectAll(".node")
                .filter(node => node === descendant)
                .attr("transform", `translate(${descendant.x},${descendant.y})`);
            }
          });
        }
        
        // Update all links
        g.selectAll(".link").attr("d", link => diagonal(link, link.parent));
      }

      function dragended(event, d) {
        // Save the new position for this node and all descendants
        d.x0 = d.x;
        d.y0 = d.y;
        
        if (d.descendants) {
          d.descendants().forEach(descendant => {
            descendant.x0 = descendant.x;
            descendant.y0 = descendant.y;
          });
        }
      }

      function diagonal(s, d) {
        if (!d) return "";
        return `M ${s.x} ${s.y}
                C ${s.x} ${(s.y + d.y) / 2},
                  ${d.x} ${(s.y + d.y) / 2},
                  ${d.x} ${d.y}`;
      }
    } catch (err) {
      console.error("Error rendering tree:", err);
      setError(err.message);
    }
  }, [treeData, viewMode]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "#FF6B6B";
      case "medium":
        return "#FFB347";
      case "low":
        return "#50C878";
      default:
        return "#999";
    }
  };

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h3>Error: {error}</h3>
        <p>Please make sure:</p>
        <ul>
          <li>The CSV file is placed in the <code>public/</code> folder</li>
          <li>The file is named <code>consolidated_prompt_injection_attacks.csv</code></li>
          <li>The file has the correct format</li>
        </ul>
      </div>
    );
  }

  if (!treeData || !attacksData) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px", height: "100%" }}>
      {/* Toggle Buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setViewMode("tree")}
          style={{
            padding: "12px 24px",
            backgroundColor: viewMode === "tree" ? "#4A90E2" : "white",
            color: viewMode === "tree" ? "white" : "#333",
            border: `2px solid ${viewMode === "tree" ? "#4A90E2" : "#ddd"}`,
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.3s ease",
          }}
        >
          Tree View
        </button>
        <button
          onClick={() => setViewMode("list")}
          style={{
            padding: "12px 24px",
            backgroundColor: viewMode === "list" ? "#4A90E2" : "white",
            color: viewMode === "list" ? "white" : "#333",
            border: `2px solid ${viewMode === "list" ? "#4A90E2" : "#ddd"}`,
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.3s ease",
          }}
        >
          List View
        </button>
      </div>

      {/* Tree View */}
      {viewMode === "tree" && (
        <div
          style={{
            width: "100%",
            height: "700px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "white",
            overflow: "hidden",
          }}
        >
          <svg ref={svgRef}></svg>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div style={{ maxWidth: "1200px" }}>
          <h2 style={{ marginBottom: "20px", color: "#333" }}>
            Attack Taxonomy List
          </h2>

          {attacksData.families.map((family, index) => (
            <div
              key={index}
              style={{
                marginBottom: "30px",
                border: "2px solid #4A90E2",
                borderRadius: "10px",
                padding: "20px",
                backgroundColor: "white",
              }}
            >
              {/* Family Header */}
              <div
                style={{
                  borderBottom: "2px solid #4A90E2",
                  paddingBottom: "10px",
                  marginBottom: "15px",
                }}
              >
                <h3 style={{ margin: "0 0 5px 0", color: "#4A90E2" }}>
                  {index + 1}. {family.name}
                </h3>
                <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                  {family.attacks.length} attack{family.attacks.length !== 1 ? "s" : ""} in this family
                </p>
              </div>

              {/* Attacks List */}
              <div style={{ display: "grid", gap: "12px" }}>
                {family.attacks.map((attack) => (
                  <div
                    key={attack.id}
                    style={{
                      padding: "15px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      backgroundColor: "#f9f9f9",
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(5px)";
                      e.currentTarget.style.backgroundColor = "#f0f7ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.backgroundColor = "#f9f9f9";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        marginBottom: "8px",
                      }}
                    >
                      <h4 style={{ margin: 0, color: "#333", fontSize: "16px" }}>
                        {attack.title}
                      </h4>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "white",
                          backgroundColor: getSeverityColor(attack.severity),
                        }}
                      >
                        {attack.severity.toUpperCase()} ({attack.severityScore}/10)
                      </span>
                    </div>

                    <p style={{ margin: "8px 0", color: "#555", fontSize: "14px" }}>
                      {attack.description}
                    </p>

                    {/* Source */}
                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid #e0e0e0",
                      }}
                    >
                      <strong style={{ fontSize: "12px", color: "#666" }}>
                        Source:{" "}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {attack.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Models Summary */}
              <div
                style={{
                  marginTop: "15px",
                  padding: "12px",
                  backgroundColor: "#f0f7ff",
                  borderRadius: "6px",
                }}
              >
                <strong style={{ fontSize: "13px", color: "#4A90E2" }}>
                  Models to be tested against {family.name}:
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {modelsData.models.map((model) => (
                    <span
                      key={model.id}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "white",
                        border: "1px solid #4A90E2",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#333",
                      }}
                    >
                      {model.name} (Defense: {model.defense_score})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}