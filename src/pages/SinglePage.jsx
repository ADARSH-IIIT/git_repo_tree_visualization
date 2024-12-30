import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import FunnyLoader from "./loader";
import toast from 'react-hot-toast'




const SinglePage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 


  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const link = queryParams.get("link");
  const isimage = queryParams.get("isimage") === "true";
  const filename = queryParams.get("filename")

  useEffect(() => {
    const fetchContent = async () => {
      if (!link) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(link);
        const data = await response.json();

        if (data.content) {
          if (isimage) {
            setContent(`data:image/png;base64,${data.content}`);
          } else {
            // Decode base64 text content
            setContent(atob(data.content));
          }
        } else {
          throw new Error("No content found in response");
        }
      } catch (err) {
        setError("Failed to fetch content: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [link, isimage]);




  

  const copyToClipboard = async () => {
    try {
      if (isimage) {
        // For image content
        const base64Image = content ; // "data:image/jpeg;base64,..."
  
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
              // console.error("Clipboard write failed:", err);
              
              toast.error("Failed to copy image to Clipboard");
            }
          });
        };
      } else {
        // For non-image content (text or file data)
        await navigator.clipboard.writeText(content );
        console.log("sssss");

        toast.success("Text copied to clipboard!");
      }
    } catch (err) {
     
      toast.error("Failed to copy to clipboard.");
    }
  };






  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center items-center">
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-lg p-6"
        style={{
          width: "90vw",
          height: "95vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="flex justify-between items-center"  > 
                    <h1 className="text-3xl font-bold mb-4 text-gray-800">{filename}</h1> 

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
        
        
         </div>

        

        {loading && <div className="text-gray-600 text-lg"><FunnyLoader/></div>}

        {error && <div className="text-red-600 text-lg">{error}</div>}

        {!loading && !error && !content && (
          <div className="text-gray-600 text-lg">No content available.</div>
        )}

        {content && (
          <div className="flex-1 overflow-auto">
            {isimage ? (
              <img
                src={content}
                alt="GitHub content"
                className="max-w-full max-h-full rounded-md"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                className="whitespace-pre-wrap break-words text-gray-700 bg-gray-50 p-4 rounded-md"
                style={{
                  fontSize: "1.25rem", // Adjusted font size for better readability
                  maxHeight: "100%",
                  overflowY: "auto",
                }}
              >
                {content}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SinglePage;
