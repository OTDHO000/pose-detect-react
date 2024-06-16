import React, { useState } from 'react';
import Papa from 'papaparse';
import { PoseEmbedding } from '../../helper/poseEmbedding';
import  {PoseGame}  from '../../helper/pose';

interface CSVData {
  [key: string]: string | number | boolean | null;
}

const config = {
	delimiter: "",	// auto-detect
	newline: "",	// auto-detect
	quoteChar: '"',
	escapeChar: '"',
	header: false,
	transformHeader: undefined,
	dynamicTyping: false,
	preview: 0,
	encoding: "",
	worker: false,
	comments: false,
	step: undefined,
	complete: undefined,
	error: undefined,
	download: false,
	downloadRequestHeaders: undefined,
	downloadRequestBody: undefined,
	skipEmptyLines: false,
	chunk: undefined,
	chunkSize: undefined,
	fastMode: undefined,
	beforeFirstChunk: undefined,
	withCredentials: undefined,
	transform: undefined,
	delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP],
	skipFirstNLines: 0
}

const CSVReaderComponent: React.FC = () => {
const [data, setData] = useState<any[]>([]);
const embedding = new PoseEmbedding()
const predictmodel = new PoseGame()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
		   const a = result.data[1] as any[]
		   console.log(a)
          setData(a as any[]);
		  const floatArray: number[]=a.slice(2).map(str => parseFloat(str));
        //   const normArr = embedding.normalize_pose_landmarks(floatArray)
        //   const embeddingres = embedding.get_pose_distance_embedding(normArr)
          predictmodel.callmodel(floatArray)
        },
        header: false,
      });
    }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default CSVReaderComponent;