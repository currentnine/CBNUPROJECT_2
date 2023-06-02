const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const stream = require('stream');

const awsRegion = 'awsRegion';
const awsAccessKeyId = 'awsAccessKeyId';
const awsSecretAccessKey = 'awsSecretAccessKey';

const s3Client = new S3Client({ region: awsRegion, credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } });
const rekognitionClient = new RekognitionClient({ region: awsRegion, credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } });

async function detectAndDraw() {
    const bucket = 'cbnuproject2';
    const imageName = 'image2.jpeg';
  
    // Download the image from S3
    const params = {
      Bucket: bucket,
      Key: imageName,
    };
  
    const data = await s3Client.send(new GetObjectCommand(params));
    const image = await loadImage(await streamToBuffer(data.Body));
  
    // Detect labels
    const paramsRekognition = {
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: imageName,
        },
      },
      MaxLabels: 10,
      MinConfidence: 70,
    };
  
    const response = await rekognitionClient.send(new DetectLabelsCommand(paramsRekognition));
  
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
  
    // Draw bounding boxes for 'Person'
    response.Labels.forEach((label) => {
      if (label.Name === 'Person') {
        label.Instances.forEach((instance) => {
          const box = instance.BoundingBox;
          const x = box.Left * image.width;
          const y = box.Top * image.height;
          const width = box.Width * image.width;
          const height = box.Height * image.height;
  
          // Draw circle if person is in the top half of the image
          if (y < image.height / 2) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
  
            context.beginPath();
            context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
            context.lineWidth = 3;
            context.strokeStyle = 'red';
            context.stroke();
          }
        });
      }
    });
  
    // Save the image
    const out = fs.createWriteStream('./output.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
  }
  

  //read file or receive the data from the network
  function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on("data", (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on("error", reject);
    });
  }
  
  detectAndDraw();
