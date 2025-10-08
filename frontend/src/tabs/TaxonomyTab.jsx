import React, { useState, useEffect } from "react";
import Tree from "react-d3-tree";
import attacksData from "../data/attacks.json";
import modelsData from "../data/models.json";

export default function TaxonomyTab() {
  const [viewMode, setViewMode] = useState("tree");
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    const transformedData = {
      name: "LLM Attacks",
      children: attacksData.families.map((family) => ({
        name: family.name,
        attributes: {
          description: family.description,
        },
        children: family.attacks.map((attack) => ({
          name: attack.title,
          attributes: {
            severity: attack.severity,
            description: attack.description,
          },
          children: modelsData.models
            .filter((model) => model.attacks_tested.includes(family.name))
            .map((model) => ({
              name: `${model.name}\n(Defense: ${model.defense_score})`,
              attributes: {
                description: model.description,
              },
            })),
        })),
      })),
    };

    setTreeData(transformedData);
  }, []);

  const nodeSize = { x: 220, y: 200 };
  const separation = { siblings: 1.5, nonSiblings: 2 };

  const renderRectSvgNode = ({ nodeDatum, toggleNode }) => {
    return (
      <g>
        <rect
          width="140"
          height="70"
          x="-70"
          y="-35"
          fill="white"
          stroke="#4A90E2"
          strokeWidth="2"
          rx="5"
          onClick={toggleNode}
          style={{ cursor: "pointer" }}
        />
        <text
          fill="black"
          strokeWidth="0"
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: "11px", fontWeight: "500", pointerEvents: "none" }}
        >
          {nodeDatum.name.split("\n").map((line, i) => (
            <tspan x="0" dy={i === 0 ? "-0.3em" : "1.2em"} key={i}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  };

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
          🌲 Tree View
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
          📋 List View
        </button>
      </div>

      {/* Tree View */}
      {viewMode === "tree" && (
        <div style={{ width: "100%", height: "700px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <Tree
            data={treeData}
            orientation="vertical"
            translate={{ x: 700, y: 100 }}
            collapsible={true}
            pathFunc="step"
            zoomable={true}
            nodeSize={nodeSize}
            separation={separation}
            renderCustomNodeElement={renderRectSvgNode}
            initialDepth={1}
            styles={{
              links: {
                stroke: "black",
                strokeWidth: 2,
              },
            }}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div style={{ maxWidth: "1200px" }}>
          <h2 style={{ marginBottom: "20px", color: "#333" }}>Attack Taxonomy List</h2>
          
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
              <div style={{ borderBottom: "2px solid #4A90E2", paddingBottom: "10px", marginBottom: "15px" }}>
                <h3 style={{ margin: "0 0 5px 0", color: "#4A90E2" }}>
                  {index + 1}. {family.name}
                </h3>
                <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>{family.description}</p>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                      <h4 style={{ margin: 0, color: "#333", fontSize: "16px" }}>{attack.title}</h4>
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
                    
                    <p style={{ margin: "8px 0", color: "#555", fontSize: "14px" }}>{attack.description}</p>
                    
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
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
                    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e0e0e0" }}>
                      <strong style={{ fontSize: "12px", color: "#666" }}>Tested on: </strong>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {modelsData.models
                          .filter((model) => model.attacks_tested.includes(family.name))
                          .map((model) => model.name)
                          .join(", ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Models Summary */}
              <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "#f0f7ff", borderRadius: "6px" }}>
                <strong style={{ fontSize: "13px", color: "#4A90E2" }}>Models defending against {family.name}:</strong>
                <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
                  {modelsData.models
                    .filter((model) => model.attacks_tested.includes(family.name))
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