import { useEffect,useLayoutEffect, useRef, useState } from 'react';
import * as mediapipePose from '@mediapipe/pose';
import { Pose, Results, NormalizedLandmarkList } from "@mediapipe/pose";

import {
  drawConnectors,
  drawLandmarks,
  Data,
  lerp,
} from '@mediapipe/drawing_utils';
import './index.scss';
import { PoseGame } from '../../helper/pose';
import meImg from '../../assets/images/me.png';
import { useSearchParams } from 'react-router-dom';


const PoseContainer = () => {
    const [searchParams] = useSearchParams();
    const [inputVideoReady, setInputVideoReady] = useState(false);
    const [loaded, setLoaded] = useState(false);
  
    const inputVideoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  
    const gameState :any= useRef();
    useLayoutEffect (() => {
      gameState.current = new PoseGame();
    },[])
    const [status, setStatus] = useState(false);
    const [faceNum, setFaceNum] :any= useState();
    const [cellImgSrc, setCellImgSrc] = useState(
      'https://www.nicepng.com/png/full/183-1834697_donald-duck-png-donald-duck-small-face.png'
    );
  
  
    useEffect(() => {
      if (!inputVideoReady) {
        return;
      }
      if (inputVideoRef.current && canvasRef.current) {
        console.log('rendering');
        contextRef.current = canvasRef.current.getContext('2d');
        const constraints = {
          video: {
            width: { min: 1280 },  // window.innerWidth 1280
            height: { min: 720 },  //window.innerHeight 720
          },
        };
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
          if (inputVideoRef.current) {
            inputVideoRef.current.srcObject = stream;
          }
          sendToMediaPipe();
        });
  
        const userPose = new Pose({
          locateFile: (file) =>
             `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
  
        userPose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
  
        userPose.onResults(onResults);
  
        const sendToMediaPipe = async () => {
          if (inputVideoRef.current) {
            if (!inputVideoRef.current.videoWidth) {
              requestAnimationFrame(sendToMediaPipe);
            } else {
              await userPose.send({ image: inputVideoRef.current });
              requestAnimationFrame(sendToMediaPipe);
            }
          }
        };
      }
    }, [inputVideoReady]);
  
    const drawGame = (poseLandmarks: NormalizedLandmarkList) => {
      if(inputVideoRef.current){
        if (canvasRef.current && contextRef.current ) {
          gameState.current.drawGame(contextRef.current, poseLandmarks, inputVideoRef.current.videoWidth, inputVideoRef.current.videoHeight);
        }
      }
      
    };
  
    const onResults = (results: Results) => {
      if (canvasRef.current && contextRef.current) {
        setLoaded(true);
  
        contextRef.current.save();
        contextRef.current.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        contextRef.current.drawImage(
          results.image,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
  
        
        drawGame(results.poseLandmarks );
       
  
        if (results.poseLandmarks && results.poseWorldLandmarks) {
           drawConnectors(contextRef.current, results.poseLandmarks, mediapipePose.POSE_CONNECTIONS, { color: '#FF0000', lineWidth: 4 });
           drawLandmarks(contextRef.current, results.poseLandmarks, { color: '#00FF00', lineWidth: 2 });

        }
        contextRef.current.restore();
      }
    };
  
  
    return (
      <div className="pose-container">
        <video
          autoPlay
          ref={(el) => {
            inputVideoRef.current = el;
            setInputVideoReady(!!el);
          }}
        />
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
        />
        {gameState.current && (
          <>
            <div className="game-controller">
              <button
                className="custom-btn btn-1"
                onClick={() => {
                  setStatus(!status);
                  gameState.current.startGame(!status);
                }}
              >
                <span>{status ? 'Stop' : 'Start'}</span>
              </button>
              <img src={cellImgSrc} alt="" id="cell-img-src" />
              <div>
                Faces:{' '}
                <input
                  value={faceNum}
                  type="number"
                  onChange={(e) => {
                    setFaceNum(parseInt(e.target.value) || 1);
                  }}
                />
              </div>
            </div>
          </>
        )}
        {!loaded && (
          <div className="loading">
            <div className="spinner"></div>
            <div className="message">Loading</div>
          </div>
        )}
      </div>
    );
  };
  
  export default PoseContainer;









