import { NormalizedLandmarkList } from '@mediapipe/pose';
import * as mediapipePose from '@mediapipe/pose';
import { PoseEmbedding } from './poseEmbedding';
import * as tf from '@tensorflow/tfjs';


export class PoseGame {
  points: number;
  status: boolean;
  poseEmbedding : PoseEmbedding;
  lastPredictionTime : any;
  upflag = false;
  downflag = false;


  constructor() {
    this.status = false;
    this.points = 0;
    this.poseEmbedding = new PoseEmbedding();
    this.lastPredictionTime = 0
  }

  startGame(status: boolean) {

    this.status = status;
    if (status) {
      this.points = 0;     
    }
  }

  getLandmarkCoord(landmarks: any, index: number) {
    return {
      x: landmarks[index].x * window.innerWidth,
      y: landmarks[index].y * window.innerHeight,
    };
  }


  weight_lefting_cal(vedio: HTMLVideoElement, poseLandmarks: NormalizedLandmarkList, ctx: CanvasRenderingContext2D,videoWidth:any, videoHeight:any){

   var landmark :any= [];
    console.log("videoW&H",videoWidth,videoHeight)
    // console.log("poselm", poseLandmarks)
    let landmarkWH :any[]= JSON.parse(JSON.stringify(poseLandmarks))
    landmarkWH = landmarkWH.map(landmark =>{
      landmark.x *= videoWidth;
      landmark.y *= videoHeight;
      landmark.z *= videoWidth;
      return landmark;
    }) 

    landmark = this.poseEmbedding.normalize_pose_landmarks(landmarkWH)
    const embeddingXY = this.poseEmbedding.get_pose_distance_embedding(landmark)
    const embedding_input :any= []
    embeddingXY.forEach((embed:any) =>{
       embedding_input.push(embed.x)
       embedding_input.push(embed.y)
       embedding_input.push(embed.z)
    })

    // poseLandmarks.forEach((lmk, i)=>{
    //   // console.log(lmk,typeof(lmk))
    //    const x =lmk.x * videoWidth;
    //    const y = lmk.y * videoHeight;
    //    const z = lmk.z * videoWidth;
    //    landmark.push(x);
    //    landmark.push(y);
    //    landmark.push(z);
    // })

      let modelres:any =[];
      modelres = this.callmodel(embedding_input)

      // const cocoDetect_res = this.poseEmbedding.cocodetect(vedio).then((data:any) =>{
      //   console.log("data", data);
      //   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      //   data.forEach((prediction:any) => {
      //     if (prediction.class === 'sports ball') {
      //       console.log('Basketball detected:---------------');
      //       const [x, y, width, height] = prediction.bbox;
      //       ctx.strokeStyle = 'red';
      //       ctx.lineWidth = 2;
      //       ctx.strokeRect(x, y, width, height);
      //       ctx.font = '18px Arial';
      //       ctx.fillStyle = 'red';
      //       ctx.fillText(`Basketball: ${Math.round(prediction.score * 100)}%`, x, y > 10 ? y - 5 : 10);
      //     }
      //   });
      // }) ;


      ctx.font = "45px Arial";
      ctx.fillStyle = "green";
      ctx.fillText(`counting ${this.points}`, 10, 50,);  



      if(modelres[1]>0.9){ 
        ctx.font = "25px Arial";
        ctx.fillStyle = "red";
        ctx.fillText('Up', 10, 80,);  
        this.setUpDown(modelres);
        console.log("up", this.upflag);
   
      }else if(modelres[0]>0.9){
        ctx.font = "25px Arial";
        ctx.fillStyle = "red";
        ctx.fillText('down', 10, 80,);  
        this.setUpDown(modelres);
        console.log("down", this.downflag);       

      }else{
      console.log("predicting");
      }

    return true;
  }

  setUpDown(prediction:any[]){
      const currentTime = Date.now();
      if (currentTime - this.lastPredictionTime <= 100) {
        console.log("timelimit")
        return false;
      }
      this.lastPredictionTime = currentTime;

      if(prediction[1]>0.9){ 
        this.upflag=true ;
      } if(prediction[0]>0.9&& this.upflag){
        this.downflag =true; 
      }

  }

    callmodel=( landmark:any[])=>{
      let modelres:any =[]
      const inputTensor = tf.tensor([landmark]);
      const prediction = this.poseEmbedding.predict(inputTensor);
      prediction.print();
      modelres = prediction.dataSync();
      
      return modelres;
   }

  drawGame=(vedio: HTMLVideoElement , ctx: CanvasRenderingContext2D, poseLandmarks: NormalizedLandmarkList, videoWidth:any, videoHeight: any)=> {

    if (!this.status) {
      return;
    }
    const cellImg = document.getElementById( 'cell-img-src') as CanvasImageSource;

    // 
    var success = this.weight_lefting_cal(vedio , poseLandmarks, ctx, videoWidth, videoHeight)

    if(success){
      if(this.upflag&& this.downflag){
        this.points++;
        this.upflag = false;
        this.downflag =false;
      }
      
    }else{}
 
  }
}
