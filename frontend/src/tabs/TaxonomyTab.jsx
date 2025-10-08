import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import attacksData from "../data/attacks.json";
import modelsData from "../data/models.json";

export default function TaxonomyTab() {
  const [viewMode, setViewMode] = useState("tree");
  const svgRef = useRef(null);
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    // Transform data for D3 tree
    const transformedData = {
      name: "LLM Attacks",
      children: attacksData.families.map((family) => ({
        name: family.name,
        description: family.description,
        children: family.attacks.map((attack) => ({
          name: attack.title,
          severity: attack.severity,
          description: attack.description,
          children: modelsData.models
            .filter((model) => model.attacks_tested.includes(family.name))
            .map((model) => ({
              name: `${model.name}\n(Defense: ${model.defense_score})`,
              description: model.description,
            })),
        })),
      })),
    };

    setTreeData(transformedData);
  }, []);

  useEffect(() => {
    if (!treeData || viewMode !== "tree") return;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const width = 1400 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add zoom behavior
    const zoom = d3.zoom().scaleExtent([0.3, 3]).on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

    svg.call(zoom);

    const tree = d3.tree().size([width, height - 100]);

    let i = 0;

    const root = d3.hierarchy(treeData);
    root.x0 = width / 2;
    root.y0 = 0;

    // Collapse all children initially
    root.children.forEach(collapse);

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
        d.y = d.depth * 180;
      });

      // Update nodes
      const node = g.selectAll(".node").data(nodes, (d) => d.id || (d.id = ++i));

      // Enter new nodes
      const nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${source.x0},${source.y0})`)
        .on("click", click);

      nodeEnter
        .append("rect")
        .attr("class", "node-rect")
        .attr("width", 140)
        .attr("height", 70)
        .attr("x", -70)
        .attr("y", -35)
        .attr("rx", 5)
        .style("fill", "white")
        .style("stroke", "#4A90E2")
        .style("stroke-width", "2")
        .style("cursor", "pointer");

      nodeEnter
        .append("text")
        .attr("class", "node-text")
        .attr("dy", ".35em")
        .text((d) => d.data.name)
        .style("fill-opacity", 1e-6)
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("text-anchor", "middle")
        .style("pointer-events", "none")
        .call(wrap, 130);

      // Update
      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate
        .transition()
        .duration(750)
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      nodeUpdate.select("text").style("fill-opacity", 1);

      nodeUpdate
        .select("rect")
        .on("mouseenter", function() {
          d3.select(this).style("fill", "#f0f7ff").style("stroke-width", "3");
        })
        .on("mouseleave", function() {
          d3.select(this).style("fill", "white").style("stroke-width", "2");
        });

      // Exit
      const nodeExit = node
        .exit()
        .transition()
        .duration(750)
        .attr("transform", (d) => `translate(${source.x},${source.y})`)
        .remove();

      nodeExit.select("text").style("fill-opacity", 1e-6);

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
        .style("stroke", "#333")
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
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    }

    function diagonal(s, d) {
      return `M ${s.x} ${s.y}
              C ${s.x} ${(s.y + d.y) / 2},
                ${d.x} ${(s.y + d.y) / 2},
                ${d.x} ${d.y}`;
    }

    function wrap(text, width) {
      text.each(function () {
        const text = d3.select(this);
        const words = text.text().split(/\n/);
        text.text(null);

        words.forEach((word, i) => {
          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", i === 0 ? "-0.3em" : "1.2em")
            .text(word);
        });
      });
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

  if (!treeData) {
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
              key={family.id}
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
                  {family.description}
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
                        {attack.severity.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: "8px 0", color: "#555", fontSize: "14px" }}>
                      {attack.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        marginTop: "8px",
                      }}
                    >
                      {attack.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "2px 8px",
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "500",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Models tested */}
                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "1px solid #e0e0e0",
                      }}
                    >
                      <strong style={{ fontSize: "12px", color: "#666" }}>
                        Tested on:{" "}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {modelsData.models
                          .filter((model) =>
                            model.attacks_tested.includes(family.name)
                          )
                          .map((model) => model.name)
                          .join(", ")}
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
                  Models defending against {family.name}:
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {modelsData.models
                    .filter((model) =>
                      model.attacks_tested.includes(family.name)
                    )
                    .map((model) => (
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
                        {model.name} ({model.defense_score})
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