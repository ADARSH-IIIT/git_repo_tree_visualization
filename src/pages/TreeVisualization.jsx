import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './TreeVisualization.css';
import { useParams } from 'react-router-dom';
import FunnyLoader from './loader';
import toast from 'react-hot-toast'





const TreeVisualization = () => {
  const treeRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const {owner, repo, branch} = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const nodePositions = useRef(new Map());
  const [selectedfile, setselectedfile] = useState(null);

  const [ currenturl ,setcurrenturl] = useState(null )

  
  
  // Helper function to check if file is an image
  const isImageFile = (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const extension = filename.split('.').pop().toLowerCase();
    return imageExtensions.includes(extension);
  };

  const fetchData = async () => {
    try {
      const baseUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
      const headers = {
        'Accept': 'application/vnd.github.v3+json'
      };
      const response = await fetch(baseUrl, { headers });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setData({"tree": result.tree});
      setLoading(false);
    } catch (error) {
      // console.error('Error fetching data:', error);
      toast.error("Network error or Incompatible repo")
    }
  };

  const fetchContentData = async (url, filename) => {
    setContentLoading(true);
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json'
      };
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      
      const isImgFile = isImageFile(filename);
      setIsImage(isImgFile);

      if (result.encoding === 'base64') {
        if (isImgFile) {
          // For images, create a data URL
          const dataUrl = `data:image/${filename.split('.').pop()};base64,${result.content}`;
          setSelectedContent(dataUrl);
        } else {
          // For text files, decode as before
          const content = atob(result.content);
          setSelectedContent(content);
        }
      } else {
        setSelectedContent(result.content);
      }
    } catch (error) {
      toast.error('Error fetching content');
      setSelectedContent('Error loading content');
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!treeRef.current) return;

    // Clear existing SVG
    d3.select(treeRef.current).selectAll("*").remove();

    // Set dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    const margin = { top: 60, right: 120, bottom: 60, left: 120 };

    // Process data function
    const processGitHubData = (data) => {
      const root = {
        name: repo,
        children: []
      };

      const pathMap = new Map();
      pathMap.set("", root);

      data?.tree.forEach(item => {
        const parts = item.path.split('/');
        let currentPath = "";
        let parent = root;

        parts.forEach(part => {
          const newPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!pathMap.has(newPath)) {
            const newNode = {
              name: part,
              path: newPath,
              type: item.type,
              url: item.url,
              size: item.size,
              children: []
            };
            parent.children.push(newNode);
            pathMap.set(newPath, newNode);
          }

          parent = pathMap.get(newPath);
          currentPath = newPath;
        });
      });

      return root;
    };

    // Create SVG
    const svg = d3.select(treeRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "tree-svg");

    // Add grid pattern
    const defs = svg.append("defs");
    defs.append("pattern")
      .attr("id", "gridPattern")
      .attr("width", 15)
      .attr("height", 15)
      .attr("patternUnits", "userSpaceOnUse")
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "none")
      .attr("stroke", "#eee")
      .attr("stroke-width", 0.5);

    // Add background with grid
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#gridPattern)");

    // Create main group for zoom
    const g = svg.append("g")
      .attr("class", "main-group")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create tree layout
    const treemap = d3.tree()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 2.5));

      // Create hierarchy
    const hierarchicalData = processGitHubData(data);
    const root = d3.hierarchy(hierarchicalData);

    // Delete node function
    const deleteNode = (nodeToDelete) => {
      if (!nodeToDelete.parent) return; // Don't delete root

      const parent = nodeToDelete.parent;
      const index = parent.children.indexOf(nodeToDelete);
      if (index > -1) {
        parent.children.splice(index, 1);
        if (parent.children.length === 0) {
          parent.children = null;
        }
        // Remove deleted node and its descendants from nodePositions
        const removeNodeAndDescendants = (node) => {
          nodePositions.current.delete(node.data.path);
          if (node.children) {
            node.children.forEach(removeNodeAndDescendants);
          }
        };
        removeNodeAndDescendants(nodeToDelete);
        update();
      }
    };

    // Diagonal generator
    const diagonal = (source, target) => {
      const sourceX = source.x;
      const sourceY = source.y;
      const targetX = target.x;
      const targetY = target.y;
      const midY = (sourceY + targetY) / 2;
      
      return `M ${sourceX} ${sourceY}
              C ${sourceX} ${midY},
                ${targetX} ${midY},
                ${targetX} ${targetY}`;
    };

    // Update links function
    const updateNodeLinks = (node) => {
      g.selectAll(".link")
        .filter(link => {
          return link.source === node || 
                 link.target === node ||
                 isDescendant(node, link.source) ||
                 isDescendant(node, link.target);
        })
        .attr("d", link => diagonal(link.source, link.target));
    };

    const isDescendant = (node1, node2) => {
      let current = node2;
      while (current.parent) {
        if (current.parent === node1) return true;
        current = current.parent;
      }
      return false;
    };

    // Drag behavior
    const drag = d3.drag()
      .subject((event, d) => ({
        x: d.x,
        y: d.y
      }))
      .on("start", (event, d) => {
        event.sourceEvent.stopPropagation();
        if (event.sourceEvent.button !== 0) return;
        
        d.dragStartX = d.x;
        d.dragStartY = d.y;
        
        d3.select(event.sourceEvent.target.closest(".node")).raise();
      })
      .on("drag", (event, d) => {
        const dx = event.x - d.dragStartX;
        const dy = event.y - d.dragStartY;
        
        const updatePositions = (node, deltaX, deltaY) => {
          node.x = node.x0 + deltaX;
          node.y = node.y0 + deltaY;
          
          d3.select(node.nodeElement)
            .attr("transform", `translate(${node.x},${node.y})`);
          
          if (node.children) {
            node.children.forEach(child => {
              updatePositions(child, deltaX, deltaY);
            });
          }
        };
        
        updatePositions(d, dx, dy);
        updateNodeLinks(d);
      })
      .on("end", (event, d) => {
        const updateStartPositions = (node) => {
          node.x0 = node.x;
          node.y0 = node.y;
          nodePositions.current.set(node.data.path, { x: node.x, y: node.y });
          if (node.children) {
            node.children.forEach(updateStartPositions);
          }
        };
        
        updateStartPositions(d);
      });

    // Update function
    const update = () => {
      const treeData = treemap(root);
      const nodes = treeData.descendants();
      const links = treeData.links();

      nodes.forEach(d => {
        const storedPosition = nodePositions.current.get(d.data.path);
        if (storedPosition) {
          d.x = storedPosition.x;
          d.y = storedPosition.y;
        } else {
          d.y = d.depth * 180;
        }
        d.x0 = d.x;
        d.y0 = d.y;
      });

      const link = g.selectAll(".link")
        .data(links)
        .join("path")
        .attr("class", "link")
        .attr("d", d => diagonal(d.source, d.target))
        .attr("stroke", "#666")
        .attr("stroke-width", 1)
        .attr("fill", "none");

      const node = g.selectAll(".node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

      nodes.forEach(d => {
        d.nodeElement = node.filter(n => n === d).node();
      });

      // Add rectangles
      node.selectAll("rect")
        .data(d => [d])
        .join("rect")
        .attr("x", d => -(d.data.name.length * 4 + 20))
        .attr("y", -15)
        .attr("width", d => d.data.name.length * 8 + 40)
        .attr("height", 30)
        .attr("fill", "white")
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .attr("rx", 4)
        .attr("cursor", "pointer")
        .on("click", (event, d) => {
          if (d.data?.url) {
            setSelectedNode(d.data);
          }
        });

      // Add main text
      node.selectAll("text.main-text")
        .data(d => [d])
        .join("text")
        .attr("class", "main-text")
        .attr("dy", "0.3em")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#0d5497")
        .text(d => d.data.name);

      // Add delete button
      const deleteButton = node.selectAll("g.delete-button")
        .data(d => [d])
        .join("g")
        .attr("class", "delete-button")
        .attr("transform", d => `translate(${d.data.name.length * 4 + 15}, -10)`)
        .style("cursor", "pointer")
        .style("opacity", 0)
        .on("dblclick", (event, d) => {
          event.stopPropagation();
          if (d.depth !== 0) {
            deleteNode(d);
          }
        });

      // Add view content button for tree nodes
      const viewButton = node.selectAll("g.view-button")
        .data(d => [d])
        .join("g")
        .attr("class", "view-button")
        .attr("transform", d => `translate(${-(d.data.name.length * 4 + 15)}, -10)`)
        .style("cursor", "pointer")
        .style("opacity", 0)
        .style("display", d => d.data.type === "blob" ? null : "none")
        .on("dblclick", (event, d) => {
          event.stopPropagation();
          if (d.data.type === "blob" && d.data.url) {
            setselectedfile(d.data.path);
            setSelectedContent(""); // Reset content
            setIsImage(false); // Reset image flag
            setcurrenturl(d.data.url)
            fetchContentData(d.data.url, d.data.path);
          }
        });

      // View button circle
      viewButton.append("circle")
        .attr("r", 8)
        .attr("fill", "#4CAF50");

      // View button icon (folder icon)
      viewButton.append("text")
        .attr("dy", "0.3em")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "12px")
        .text("📁");

      // Delete button circle
      deleteButton.append("circle")
        .attr("r", 8)
        .attr("fill", "#ff4444");

      // Delete button X symbol
      deleteButton.append("text")
        .attr("dy", "0.3em")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "12px")
        .text("×");

      // Show/hide buttons on hover
      node
        .on("mouseenter", function() {
          d3.select(this).selectAll(".delete-button, .view-button")
            .transition()
            .duration(200)
            .style("opacity", 1);
        })
        .on("mouseleave", function() {
          d3.select(this).selectAll(".delete-button, .view-button")
            .transition()
            .duration(200)
            .style("opacity", 0);
        });

      node.call(drag);
    };

    update();

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      svg
        .attr("width", newWidth)
        .attr("height", newHeight);
        
      treemap.size([
        newWidth - margin.left - margin.right,
        newHeight - margin.top - margin.bottom
      ]);
      
      update();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);




  const copyToClipboard = async () => {
    try {
      if (isImage) {
        // For image content
        const base64Image = selectedContent; // "data:image/jpeg;base64,..."
  
        // Create an Image object
        const img = new Image();
        img.src = base64Image;
  
        // Wait for the image to load
        img.onload = async () => {
          // Create a canvas and draw the image
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
  
          // Select the image content from the canvas
          canvas.toBlob(async (blob) => {
            try {
              // Try to write using Clipboard API
              const clipboardItem = new ClipboardItem({
                [blob.type]: blob,
              });
              await navigator.clipboard.write([clipboardItem]);
              toast.success("Image copied to clipboard!");
            } catch (err) {
             
              toast.error("Failed to copy image to Clipboard");
            }
          });
        };
      } else {
        // For non-image content (text or file data)
        await navigator.clipboard.writeText(selectedContent);
        toast.success("Text copied to clipboard!");
      }
    } catch (err) {
      // console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy to clipboard.");
    }
  };



  function openthisinnewtab(){

// console.log(String(isImage));

    window.open(`/singlepage?link=${currenturl}&isimage=${isImage}&filename=${selectedfile}`, "_blank");
    
    
    
  }



  // Function to display the instructions in an alert box
function showInstructions(e) {
  e.preventDefault()
  const instructions = `
      1. Ctrl + H --> for help
      2. Ctrl + F --> search any file/folder
      3. Escape   --> to stop the blinking effect
      4. Hover over any node --> you'll get 2 options
           * Option 1 --> Folder icon to open that file
           * Option 2 --> Red cross icon to delete that node temporarily
      5. Double click on folder icon / delete icon      
  `;
  alert(instructions);
}


  


  // Perform search for the term
  const performSearch = (searchTerm) => {

    const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
    const all_rectangles = document.getElementsByClassName("main-text")


    let isblibking = false 
    Array.from(all_rectangles).forEach(rectangle => {
      if (rectangle.__data__.data.name.trim().toLowerCase().includes(lowerCaseSearchTerm) ) {
      

          const rectSibling = rectangle.previousElementSibling || rectangle.nextElementSibling;

          // Add a new class blink  to the sibling <rect> element if it exists
          if (rectSibling && rectSibling.tagName.toLowerCase() === 'rect') {
              rectSibling.classList.add('blink'); // Replace 'highlight' with your desired class name
              isblibking  =true 
          }

      }
  });

  if(isblibking){
    toast('press ESCAPE to stop blinking..')
  }
  

    


  };



  // Remove blinking
  const removeHighlights = () => {
    const elements = document.querySelectorAll(".blink");
    elements.forEach((el) => el.classList.remove("blink"));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
       removeHighlights(); // Clear previous highlights

        const searchTerm = prompt("Enter the file/folder to search:");
        if (searchTerm) {
          
          
          performSearch(searchTerm);
        }
      } else if (e.key === "Escape") {
        removeHighlights();
      } 

      else if (e.ctrlKey && e.key === 'h') {
        showInstructions(e);
    }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  




  

  return (
    loading ? <FunnyLoader loading_heading={"Fetching_folder_structure"}/> :
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={treeRef} style={{ width: '100%', height: '100%' }} />
      {selectedNode && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'white',
            padding: '15px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '300px'
          }}
        >
          <h3>{selectedNode.name}</h3>
          <p>Type: {selectedNode.type === "blob" ? "file" : "folder"}</p>
          {selectedNode.size && <p>Size: {selectedNode.size} bytes</p>}
          <button
            onClick={() => setSelectedNode(null)}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              borderRadius: '4px',
              border: 'none',
              background: '#0d2697',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          
        </div>
      )}
      {selectedfile && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '80%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid grey' , 
            minWidth : '50vw'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div    className = "flex a1"   > 
    
                    < div  className='hideoverflowleft'>  *{selectedfile}</ div >
           </div>



            <div  className = "flex a2" >


                            <button
                                  onClick={openthisinnewtab}
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: "4px",
                                    border: "none",
                                    background: "#db3724",
                                    color: "white",
                                    cursor: "pointer",
                                    margin: "5px",
                                    boxShadow: "0 4px #9e2a1c", // Shadow for the button
                                    transition: "all 0.1s ease", // Smooth animation , 
                                    outline : "none" , 
                                    // fontSize : '12px'  
                                  }}
                                  onMouseDown={(e) => {
                                    e.target.style.transform = "translateY(4px)"; // Button moves down slightly
                                    e.target.style.boxShadow = "0 1px #9e2a1c"; // Shadow becomes smaller
                                  }}
                                  onMouseUp={(e) => {
                                    e.target.style.transform = "translateY(0)"; // Button moves back to normal
                                    e.target.style.boxShadow = "0 4px #9e2a1c"; // Shadow restored
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0)"; // Reset on mouse leave
                                    e.target.style.boxShadow = "0 4px #9e2a1c"; // Shadow restored
                                  }}
                                >
                                  Open_in_new_tab
                            </button>

              

                            <button
                                onClick={copyToClipboard}
                                style={{
                                  padding: "3px 10px",
                                  borderRadius: "4px",
                                  border: "none",
                                  outline : "none" , 
                                  background: "#0d2697",
                                  color: "white",
                                  cursor: "pointer",
                                  margin: "5px",
                                  boxShadow: "0 4px #081a5c", // Shadow for the button
                                  transition: "all 0.1s ease", // Smooth animation
                                  // fontSize : '12px'

                                }}
                                onMouseDown={(e) => {
                                  e.target.style.transform = "translateY(4px)"; // Button moves down slightly
                                  e.target.style.boxShadow = "0 1px #081a5c"; // Shadow becomes smaller
                                }}
                                onMouseUp={(e) => {
                                  e.target.style.transform = "translateY(0)"; // Button moves back to normal
                                  e.target.style.boxShadow = "0 4px #081a5c"; // Shadow restored
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)"; // Reset on mouse leave
                                  e.target.style.boxShadow = "0 4px #081a5c"; // Shadow restored
                                }}
                              >
                                Copy
                              </button>

              
                              <button
                                        onClick={() => {
                                          setSelectedContent(null);
                                          setselectedfile(null);
                                          setIsImage(false);
                                        }}
                                        style={{
                                          padding: "3px 10px",
                                          borderRadius: "4px",
                                          border: "none",
                                          outline : "none" , 
                                          background: "#1de231",
                                          color: "white",
                                          cursor: "pointer",
                                          margin: "5px",
                                          boxShadow: "0 4px #16a626", // Shadow for the button
                                          transition: "all 0.1s ease", // Smooth animation
                                          // fontSize : '12px'

                                        }}
                                        onMouseDown={(e) => {
                                          e.target.style.transform = "translateY(4px)"; // Button moves down slightly
                                          e.target.style.boxShadow = "0 1px #16a626"; // Shadow becomes smaller
                                        }}
                                        onMouseUp={(e) => {
                                          e.target.style.transform = "translateY(0)"; // Button moves back to normal
                                          e.target.style.boxShadow = "0 4px #16a626"; // Shadow restored
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.transform = "translateY(0)"; // Reset on mouse leave
                                          e.target.style.boxShadow = "0 4px #16a626"; // Shadow restored
                                        }}
                                      >
                                        Close 
                                      </button>



            </div>
          </div>
          <div style={{ minHeight: '100px', minWidth: '300px' }}>
            {contentLoading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px' 
              }}>
                <FunnyLoader loading_heading={"Fetching_file_content"}  />
              </div>
            ) : (
              isImage ? (
                <img 
                  src={selectedContent} 
                  alt={selectedfile}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '70vh',
                    objectFit: 'contain'
                  }} 
                />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {selectedContent}
                </pre>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeVisualization;