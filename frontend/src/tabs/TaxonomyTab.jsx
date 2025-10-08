import React, { useState, useEffect } from "react";
import Tree from "react-d3-tree";
import attacksData from "../data/attacks.json";
import modelsData from "../data/models.json";

export default function TaxonomyTab() {
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    // 將 attacks.json 轉換成樹狀結構
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

  if (!treeData) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ width: "100%", height: "700px" }}>
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
  );
}