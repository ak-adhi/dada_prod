import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

export default function TaxonomyTab() {
  const [viewMode, setViewMode] = useState("tree");
  const svgRef = useRef(null);
  const [treeData, setTreeData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 從 API 獲取數據
        const response = await fetch('/api/v1/list/tax_tree');
        if (!response.ok) throw new Error('Failed to fetch');
        
        const attacksData = await response.json();
        
        if (attacksData.length === 0) {
          setError("No data available");
          setLoading(false);
          return;
        }

        // Group attacks by family
        const familiesMap = new Map();

        attacksData.forEach((attack) => {
          const familyName = attack.attack_family;
          if (!familiesMap.has(familyName)) {
            familiesMap.set(familyName, {
              name: familyName,
              attacks: [],
            });
          }

          familiesMap.get(familyName).attacks.push({
            id: attack.id,
            title: attack.attack_name,
            description: attack.attack_prompt,
            usecase: attack.usecase,
            severity: "high",
          });
        });

        const families = Array.from(familiesMap.values());
        setProcessedData({ families });

        const transformedData = {
          name: "LLM Attacks",
          children: families.map((family) => ({
            name: family.name.replace(/_/g, " "),
            children: family.attacks.slice(0, 8).map((attack) => ({
              name: attack.title,
              description: attack.description,
              usecase: attack.usecase,
            })),
          })),
        };

        setTreeData(transformedData);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!treeData || viewMode !== "tree") return;

    try {
      d3.select(svgRef.current).selectAll("*").remove();

      const width = 1600;
      const height = 800;

      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height);

      const g = svg.append("g");

      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);

      const initialTransform = d3.zoomIdentity.translate(width / 2, 50).scale(0.7);
      svg.call(zoom.transform, initialTransform);

      const tree = d3.tree()
        .size([width - 200, height - 200])
        .separation((a, b) => {
          if (a.parent === b.parent) {
            return 2;
          } else {
            return 3;
          }
        });

      let i = 0;

      const root = d3.hierarchy(treeData);
      root.x0 = 0;
      root.y0 = 0;

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

        nodes.forEach((d) => {
          d.y = d.depth * 220;
        });

        const node = g.selectAll(".node").data(nodes, (d) => d.id || (d.id = ++i));

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
          .style("cursor", "move")
          .style("transition", "all 0.3s ease");

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

            lines = lines.slice(0, 4);

            lines.forEach((line, i) => {
              textElement.append("tspan")
                .attr("x", 0)
                .attr("dy", i === 0 ? `-${(lines.length - 1) * 0.5}em` : "1.1em")
                .text(line.length > 22 ? line.substring(0, 20) + "..." : line);
            });
          });

        const nodeUpdate = nodeEnter.merge(node);

        nodeUpdate
          .transition()
          .duration(750)
          .attr("transform", (d) => `translate(${d.x},${d.y})`);

        nodeUpdate
          .select("rect")
          .on("mouseenter", function () {
            const rect = d3.select(this);
            rect
              .transition()
              .duration(200)
              .style("fill", "#D6EAFF")
              .style("stroke-width", "3")
              .style("stroke", "#1976D2")
              .attr("y", -42)
              .style("filter", "drop-shadow(0 6px 12px rgba(25, 118, 210, 0.4))");
          })
          .on("mouseleave", function () {
            const rect = d3.select(this);
            rect
              .transition()
              .duration(200)
              .style("fill", "white")
              .style("stroke-width", "2")
              .style("stroke", "#4A90E2")
              .attr("y", -40)
              .style("filter", "none");
          });

        const nodeExit = node
          .exit()
          .transition()
          .duration(750)
          .attr("transform", (d) => `translate(${source.x},${source.y})`)
          .remove();

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
        const dx = event.x - d.x;
        const dy = event.y - d.y;

        d.x = event.x;
        d.y = event.y;

        d3.select(this).attr("transform", `translate(${d.x},${d.y})`);

        if (d.descendants) {
          d.descendants().forEach(descendant => {
            if (descendant !== d) {
              descendant.x += dx;
              descendant.y += dy;

              g.selectAll(".node")
                .filter(node => node === descendant)
                .attr("transform", `translate(${descendant.x},${descendant.y})`);
            }
          });
        }

        g.selectAll(".link").attr("d", link => diagonal(link, link.parent));
      }

      function dragended(event, d) {
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

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>;
  }

  if (!treeData || !processedData) {
    return <div style={{ padding: "20px" }}>No data</div>;
  }

  return (
    <div style={{ padding: "20px", height: "100%" }}>
      {/* Toggle Buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setViewMode("tree")}
          style={{
            padding: "12px 24px",
            backgroundColor: "white",
            color: viewMode === "tree" ? "#1976D2" : "#333",
            border: "2px solid",
            borderColor: viewMode === "tree" ? "#1976D2" : "#ddd",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.backgroundColor = "#D6EAFF";
            e.currentTarget.style.borderColor = "#1976D2";
            e.currentTarget.style.color = "#1976D2";
            e.currentTarget.style.boxShadow = "0 6px 12px rgba(25, 118, 210, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            if (viewMode !== "tree") {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.borderColor = "#ddd";
              e.currentTarget.style.color = "#333";
            }
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Tree View
        </button>
        <button
          onClick={() => setViewMode("list")}
          style={{
            padding: "12px 24px",
            backgroundColor: viewMode === "list" ? "#D6EAFF" : "white",
            color: viewMode === "list" ? "#1976D2" : "#333",
            border: "2px solid",
            borderColor: viewMode === "list" ? "#1976D2" : "#ddd",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.backgroundColor = "#D6EAFF";
            e.currentTarget.style.borderColor = "#1976D2";
            e.currentTarget.style.color = "#1976D2";
            e.currentTarget.style.boxShadow = "0 6px 12px rgba(25, 118, 210, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            if (viewMode !== "list") {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.borderColor = "#ddd";
              e.currentTarget.style.color = "#333";
            }
            e.currentTarget.style.boxShadow = "none";
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

          {processedData.families.map((family, index) => (
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
              <div
                style={{
                  borderBottom: "2px solid #4A90E2",
                  paddingBottom: "10px",
                  marginBottom: "15px",
                }}
              >
                <h3 style={{ margin: "0 0 5px 0", color: "#4A90E2" }}>
                  {index + 1}. {family.name.replace(/_/g, " ")}
                </h3>
                <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                  {family.attacks.length} attack{family.attacks.length !== 1 ? "s" : ""} in this family
                </p>
              </div>

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
                        {attack.severity.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: "8px 0", color: "#555", fontSize: "14px" }}>
                      {attack.description}
                    </p>

                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid #e0e0e0",
                      }}
                    >
                      <strong style={{ fontSize: "12px", color: "#666" }}>
                        Use Case:{" "}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#666", textTransform: "capitalize" }}>
                        {attack.usecase}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}