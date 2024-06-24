import * as fs from 'fs';
import * as mediapipePose from '@mediapipe/pose';
import * as tf from '@tensorflow/tfjs';
import Big from 'big.js';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
// import * as csv from 'csv-parser';


export class PoseEmbedding {
  model :any ;
  cocomodel :any;

  constructor( ) {
    // this._topNByMeanDistance = 10;
    // this._axesWeights = axesWeights;
    this.loadModel();
  }
  private async loadModel() {
    try {
      this.model = await tf.loadGraphModel('http://localhost:3000/model69/model.json');
      console.log('Model loaded successfully');
      this.cocomodel = await cocoSsd.load();
      console.log('cocoSSd Model load');
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }
  public predict(input: tf.Tensor) {
    if (!this.model) {
      throw new Error('Model not loaded yet');
    }
    const prediction = this.model.predict(input) as tf.Tensor;
    return prediction;
  }

  public cocodetect(vedio: HTMLVideoElement) {    
    const predictions = this.cocomodel.detect(vedio);
    return predictions;
  }

  normalize_pose_landmarks(landmarks: any[] ) {
    const pose_center = this.get_pose_center(landmarks);
    let landmarksArr:any = JSON.parse(JSON.stringify(landmarks));
    //  # Normalize translation. 
    for (let i = 0; i < landmarksArr.length; i++) {  
        landmarksArr[i].x -= pose_center[0]; // 
        landmarksArr[i].y -= pose_center[1]; // 
        landmarksArr[i].z -= pose_center[2]; // 
        // console.log("landmarksArr[i] 222--",landmarksArr[i]  ) 
    } 
    // console.log('after normalize translation landmarkArr:', landmarksArr) 

    // Normalizes landmarks translation and scale.
    const pose_size = this.get_pose_size(landmarksArr)
  
    let landmarksArr2:any = JSON.parse(JSON.stringify(landmarksArr));
    for (let i = 0; i < landmarksArr.length; i++) {  
        landmarksArr2[i].x = landmarksArr2[i].x/pose_size *100; // 
        landmarksArr2[i].y = landmarksArr2[i].y/pose_size *100; //  
        landmarksArr2[i].z = landmarksArr2[i].z/pose_size *100;
    }
    // console.log('after normalize scale landmark:', landmarksArr2) 
    return landmarksArr2;
  }

   get_pose_center(landmarks: any[]){
      const left_hip = landmarks[mediapipePose.POSE_LANDMARKS.LEFT_HIP];
      const right_hip = landmarks[mediapipePose.POSE_LANDMARKS.RIGHT_HIP];
      const center = [];     
        center.push((left_hip.x + right_hip.x) *0.5) ; // 
        center.push((left_hip.y + right_hip.y) *0.5) ; //  
        center.push((left_hip.z + right_hip.z) *0.5 ); //     
    return center;
  }

  //Calculates pose size.
//   It is the maximum of two values:
//   * Torso size multiplied by `torso_size_multiplier`
//   * Maximum distance from pose center to any pose landmark
  get_pose_size( landmarks: any[]){
      const torso_size_multiplier =  2.5;

      const landmark2d = landmarks;
      // Hips center 
      const left_hip = landmark2d[mediapipePose.POSE_LANDMARKS.LEFT_HIP];
      const right_hip = landmark2d[mediapipePose.POSE_LANDMARKS.RIGHT_HIP];
      const hips = [];   
 
      let lefthx = new Big(left_hip.x)
      let righthx = new Big(right_hip.x)
      let lefthy = new Big(left_hip.y)
      let righthy = new Big(right_hip.y)
      hips.push(  lefthx.add(righthx).times(0.5)); // (left_hip.x + right_hip.x) *0.5
      hips.push( lefthy.add(righthy).times(0.5) ); //   (left_hip.y + right_hip.y) *0.5

      // // shoulder center 
      const left_shoulder = landmark2d[mediapipePose.POSE_LANDMARKS.LEFT_SHOULDER];
      const right_shoulder = landmark2d[mediapipePose.POSE_LANDMARKS.RIGHT_SHOULDER];
      const shoulders = [];      
      shoulders.push( (left_shoulder.x + right_shoulder.x) *0.5 ); // 
      shoulders.push( (left_shoulder.y + right_shoulder.y) *0.5 ); //

     // --  Torso size as the minimum body size.   torso_size = np.linalg.norm(shoulders - hips)        
        const torso_size= this.calculateEuclideanDistances(shoulders, hips);  
        console.log("np.linalg.norm:",torso_size)          
        //Max dist to pose center.
        const pose_center = hips
        var  landmark2d_s = JSON.parse(JSON.stringify(landmarks))
        for (let i = 0; i < landmark2d_s.length; i++) {  
          landmark2d_s[i].x = landmark2d_s[i].x - pose_center[0].toNumber() ; // 
          landmark2d_s[i].y = landmark2d_s[i].y - pose_center[1].toNumber() ; // 
          } 
        const nplinalgnorm = this.calculateL2Norm(landmark2d_s, pose_center)
        const max_dist = Math.max.apply(null,nplinalgnorm)
        return Math.max(torso_size* 2.5, max_dist)
      
  }

  // np.linalg.norm(shoulders - hips)
    calculateEuclideanDistances(shoulders: any[], hips:any[]) {  
        let sumOfSquaredDistances = 0;  
        if (shoulders.length !== hips.length || shoulders[0].length !== hips[0].length) {  
            throw new Error('The arrays must have the same shape.');  
        }      
        for (let i = 0; i < shoulders.length; i++) {           
            const diff = shoulders[i] - hips[i];  
            sumOfSquaredDistances += diff * diff;             
        }      
        return Math.sqrt(sumOfSquaredDistances);  
    }

  calculateL2Norm(landmarks :any[], pose_center:any[]) {  
    
      const result = [];  
      for (let i = 0; i < landmarks.length; i++) {    
          const landmarkx = landmarks[i].x - pose_center[0];  
          const landmarky = landmarks[i].y - pose_center[1];
          const norm = Math.sqrt(landmarkx*landmarkx + landmarky*landmarky)
          result.push(norm);  
      }  
      return result;  
  } 

  get_pose_distance_embedding( landmarks:any[]){
    const embeddingArr :any=[]
    // One joint
    const hip_avg = this.get_average_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_HIP,mediapipePose.POSE_LANDMARKS.RIGHT_HIP)
    const shoulder_avg = this.get_average_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_SHOULDER,mediapipePose.POSE_LANDMARKS.RIGHT_SHOULDER)
    const avg_dis = this.get_distance(hip_avg, shoulder_avg)
    embeddingArr.push(avg_dis)

    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_SHOULDER,mediapipePose.POSE_LANDMARKS.LEFT_ELBOW))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.RIGHT_SHOULDER,mediapipePose.POSE_LANDMARKS.RIGHT_ELBOW))

    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_ELBOW,mediapipePose.POSE_LANDMARKS.LEFT_WRIST))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.RIGHT_ELBOW,mediapipePose.POSE_LANDMARKS.RIGHT_WRIST))

    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_HIP,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_KNEE))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_HIP,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_KNEE))

    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_KNEE,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_ANKLE))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_KNEE,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE))
   // Two joints
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_SHOULDER,mediapipePose.POSE_LANDMARKS.LEFT_WRIST))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.RIGHT_SHOULDER,mediapipePose.POSE_LANDMARKS.RIGHT_WRIST))

    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_HIP,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_ANKLE))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.RIGHT_HIP,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE))
    // four joints
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_HIP,mediapipePose.POSE_LANDMARKS.LEFT_WRIST))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.RIGHT_HIP,mediapipePose.POSE_LANDMARKS.RIGHT_WRIST))
    // five joints
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_SHOULDER,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_ANKLE))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.RIGHT_SHOULDER,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_HIP,mediapipePose.POSE_LANDMARKS.LEFT_WRIST))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.RIGHT_HIP,mediapipePose.POSE_LANDMARKS.RIGHT_WRIST))
    // cross body 
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_ELBOW,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_ELBOW))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_KNEE,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_KNEE))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS.LEFT_WRIST,mediapipePose.POSE_LANDMARKS.RIGHT_WRIST))
    embeddingArr.push(this.get_distance_by_names(landmarks,mediapipePose.POSE_LANDMARKS_LEFT.LEFT_ANKLE,mediapipePose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE))
    
    return embeddingArr;
  }

  get_average_by_names( landmarks:any[], name_from:number, name_to:number){
    const lmk_from = landmarks[name_from]
    const lmk_to = landmarks[name_to]
    const dis_avg = {x:0,y:0,z:0}
      dis_avg.x = (lmk_from.x + lmk_to.x) *0.5;
      dis_avg.y = (lmk_from.y + lmk_to.y) *0.5;
      dis_avg.z = (lmk_from.z + lmk_to.z) *0.5;
    return  dis_avg ;
  }
    

  get_distance_by_names( landmarks:any[], name_from:number, name_to:number){
    const lmk_from = landmarks[name_from]
    const lmk_to = landmarks[name_to]
    let distance = {x:0,y:0,z:0}
      distance.x = lmk_to.x - lmk_from.x;
      distance.y = lmk_to.y - lmk_from.y;
      distance.z = lmk_to.z - lmk_from.z;

    return distance;
  }

  get_distance( landmark_from:any, landmark_to:any){
    let distance = {x:0,y:0,z:0}
      distance.x = landmark_to.x - landmark_from.x;
      distance.y = landmark_to.y - landmark_from.y;
      distance.z = landmark_to.z - landmark_from.z;
    return distance;
  }


 
}

function Matrix2Dmean(arr: number[][]): number {
    const sum = arr.reduce((acc, curr) => acc + curr.reduce((a, c) => a + c, 0), 0);
    return sum / (arr.length * arr[0].length);
}


