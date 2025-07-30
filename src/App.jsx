import React, { useState } from 'react';
import { useRef } from "react";
import Navbar from './Navbar';
import LoadingSpinner from './components/LoadingSpinner';

 const REGION = "ap-south-1";
const BUCKET = "file-share-rachit-jain";


const App = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sharableLink, setSharableLink] = useState("");
 

  const handleFileChange = (e) => {
  const selectedFile = e.target.files[0];
  console.log("File selected:", selectedFile);
  setFile(selectedFile);
};

async function shortenUrl(longUrl) {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    const shortUrl = await res.text();
    return shortUrl;
  } catch (err) {
    console.error("URL shortening failed", err);
    return longUrl;
  }
}


const handleUpload = async () => {
  if (!file) return alert("Please select a file first");

  setIsUploading(true);
  setProgress(0);
  setSharableLink("");

  try {
    // Step 1: Get Presigned PUT URL from Lambda
    const presignRes = await fetch("https://dnbcyl6wjpxp2meblqbhqo7kiq0mlbhw.lambda-url.ap-south-1.on.aws/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
      }),
    });

    const { url: uploadUrl } = await presignRes.json();

    // Step 2: Upload to S3 with progress
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) resolve();
        else reject(new Error("Upload failed with status " + xhr.status));
      };

      xhr.onerror = () => reject(new Error("XHR upload failed"));
      xhr.send(file);
    });

    // Step 3: Get Presigned GET URL from Lambda
    const getLinkRes = await fetch("https://dnbcyl6wjpxp2meblqbhqo7kiq0mlbhw.lambda-url.ap-south-1.on.aws/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        action: "get", // This tells Lambda to generate a GET (download) URL
      }),
    });

    const { url: downloadUrl } = await getLinkRes.json();
const shortUrl = await shortenUrl(downloadUrl);
setSharableLink(shortUrl);
    alert("✅ File uploaded successfully!");
  } catch (error) {
    console.error("Upload failed:", error);
    alert("❌ Upload failed!");
  }

  setIsUploading(false);
  setProgress(100);
  setFile(null);
};


//  const handleUpload = async () => {
//   console.log("Upload button clicked");
// <button onClick={handleUpload} type="button">Upload</button>

//   if (!file) {
//     alert("Please select a file first");
//     return;
//   }

//   console.log("Selected file:", file);
//   console.log("Sending to Lambda:", {
//     fileName: file?.name,
//     fileType: file?.type,
//   });

//   setIsUploading(true);
//   setProgress(0);
//   setSharableLink("");

//   try {
//     const presignRes = await fetch("https://dnbcyl6wjpxp2meblqbhqo7kiq0mlbhw.lambda-url.ap-south-1.on.aws/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         fileName: file.name,
//         fileType: file.type,
//       }),
//     });

//     if (!presignRes.ok) {
//       const errText = await presignRes.text();
//       throw new Error(`Lambda error: ${errText}`);
//     }

//     const { url } = await presignRes.json();

//     await new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.open("PUT", url, true);
//       xhr.setRequestHeader("Content-Type", file.type);

//       xhr.upload.onprogress = (event) => {
//         if (event.lengthComputable) {
//           const percent = Math.round((event.loaded / event.total) * 100);
//           setProgress(percent);
//         }
//       };

//       xhr.onload = () => {
//         if (xhr.status === 200) resolve();
//         else reject(new Error("Upload failed with status " + xhr.status));
//       };

//       xhr.onerror = () => reject(new Error("XHR upload failed"));
//       xhr.send(file);
//     });

//     const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${file.name}`;
//     setSharableLink(publicUrl);
//     alert("✅ File uploaded successfully!");
//   } catch (error) {
//     console.error("Upload failed:", error);
//     alert("❌ Upload failed!\n" + error.message);
//   }

//   setIsUploading(false);
//   setProgress(100);
//   setFile(null);
// };


  // const handleUpload = async () => {
  //   if (!file) return alert("Please select a file first");

  //   setIsUploading(true);
  //   setProgress(0);
  //   setSharableLink("");

  //   try {
  //     const toBase64 = (file) =>
  //       new Promise((resolve, reject) => {
  //         const reader = new FileReader();
  //         reader.readAsDataURL(file);
  //         reader.onload = () => resolve(reader.result.split(',')[1]); // remove prefix
  //         reader.onerror = (error) => reject(error);
  //       });

  //     const base64Content = await toBase64(file);

  //     const response = await fetch("https://dnbcyl6wjpxp2meblqbhqo7kiq0mlbhw.lambda-url.ap-south-1.on.aws/", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         fileName: file.name,
  //         fileContentBase64: base64Content,
  //       }),
  //     });

  //     let result;

  //     if (response.ok) {
  //       result = await response.json();
  //       setSharableLink(result.url);
  //       alert("✅ File uploaded successfully!");
  //     } else {
  //       const errorText = await response.text();
  //       console.error("Server error:", errorText);
  //       alert("❌ Upload failed!\n" + errorText);
  //     }
  //   } catch (error) {
  //     console.error("Upload failed:", error);
  //     alert("❌ Upload failed! " + error.message);
  //   }

  //   setIsUploading(false);
  //   setProgress(100);
  //   setFile(null);
  // };

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 min-h-screen scroll-smooth">
      <Navbar />

      <section id="home" className="pt-28 px-6 md:px-20 pb-20 text-center animate-fadeIn">
        <h1 className="text-4xl font-bold text-blue-700 mb-4">Welcome to File Uploader</h1>
        <p className="text-gray-600 text-lg">Smooth. Fast. Secure.</p>
      </section>

      <section id="features" className="px-6 md:px-20 py-16 animate-fadeIn">
        <h2 className="text-2xl font-bold text-blue-600 mb-6">🌟 Features</h2>
        <ul className="space-y-4 text-gray-700">
          <li>⚡ Fast Uploads with Progress Tracking</li>
          <li>🔒 Secure AWS S3 Integration</li>
          <li>🎨 Beautiful, Responsive UI</li>
          <li>📁 Multiple File Format Support</li>
        </ul>
      </section>

      <section id="upload" className="px-6 md:px-20 py-16 animate-fadeIn">
        <h2 className="text-2xl font-bold text-blue-600 mb-6">📤 Upload Your File</h2>

        <div className="bg-white shadow-lg p-6 rounded-xl max-w-md mx-auto border border-blue-100">
          <input
            type="file"
            onChange={handleFileChange}
            className="mb-4 w-full text-gray-600"

          />
          <p className="text-sm text-gray-500">
  Selected File: {file?.name || "None"}
</p>

          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-all duration-300 w-full"
            disabled={isUploading || !file}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>

          {isUploading && (
            <div className="mt-4 space-y-2">
              <LoadingSpinner />
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-blue-600">{progress}%</p>
            </div>
          )}

         {sharableLink && (
  <div className="mt-4 text-sm text-green-600 break-words">
    <p>✅ File uploaded successfully:</p>
    <div className="flex items-center space-x-2">
      <a
        href={sharableLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all"
      >
        {sharableLink}
      </a>
      <button
        onClick={() => {
          navigator.clipboard.writeText(sharableLink);
          alert("🔗 Link copied to clipboard!");
        }}
        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
      >
        Copy
      </button>
    </div>
  </div>
)}

        </div>
      </section>

      <section id="contact" className="px-6 md:px-20 py-16 animate-fadeIn">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">📬 Contact Us</h2>
        <p className="text-gray-700 max-w-xl mx-auto">
          For any queries or suggestions, feel free to reach out at
          <a href="mailto:jainrachit310@gmail.com" className="text-blue-600 underline ml-1">
            jainrachit310@gmail.com
          </a>.
        </p>
      </section>

      <footer className="text-center text-gray-500 text-sm py-6 border-t border-gray-200">
        © {new Date().getFullYear()} FileUploader. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
