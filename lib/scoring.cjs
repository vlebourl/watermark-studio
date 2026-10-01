const criteria=[{key:'framing',label:'Cadrage'},{key:'exposure',label:'Exposition'},{key:'focus',label:'Mise au point'},{key:'originality',label:'Originalité'},{key:'composition',label:'Composition'},{key:'subjective',label:'Évaluation subjective'}];
const defaultWeights=Object.fromEntries(criteria.map(c=>[c.key,1]));
function normalizeWeights(weights){const result={};for(const {key} of criteria){const value=weights?.[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>10)throw new Error('Chaque poids doit être un nombre entre 0 et 10.');result[key]=value;}return result;}
function validateAssessment(value){
 const result={};for(const {key,label} of criteria){const item=value?.[key];if(!item||typeof item.score!=='number'||!Number.isFinite(item.score)||item.score<0||item.score>10)throw new Error(`Note invalide : ${label}.`);if(typeof item.reason!=='string'||!item.reason.trim())throw new Error(`Justification manquante : ${label}.`);result[key]={score:item.score,reason:item.reason.trim().slice(0,3000)};for(const field of ['evidence','defects','uncertainty'])if(typeof item[field]==='string')result[key][field]=item[field].trim().slice(0,3000);}
 for(const key of ['summary','improvement','limitations']){if(typeof value[key]!=='string'||!value[key].trim())throw new Error('Synthèse de la critique incomplète.');result[key]=value[key].trim().slice(0,4000);}return result;
}
function overall(assessment,weights){const w=normalizeWeights(weights),sum=Object.values(w).reduce((a,b)=>a+b,0);if(sum===0)return null;if(!assessment)return null;return criteria.reduce((total,{key})=>total+assessment[key].score*w[key],0)/sum;}
module.exports={criteria,defaultWeights,normalizeWeights,validateAssessment,overall};
