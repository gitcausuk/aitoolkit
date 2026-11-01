(function(){
'use strict';
function draft(input){
 const d=input||{};const p=({'not-permitted':'none',limited:'limited',open:'open',integral:'integral',local:'local'})[d.permission]||d.permission;
 const declaration='Use the declaration format prescribed for this assessment by the relevant department or programme. [Insert the required format or link and submission instructions.]';
 if(d.localWording && d.localWording.trim())return {wording:d.localWording,permitted:'[Use the permitted activities specified in the approved wording above.]',prohibited:'[Use the exclusions specified in the approved wording above.]',declaration,usesLocalWording:true};
 let permitted=d.allowed||'[LIST THE PERMITTED ACTIVITIES]',prohibited=d.excluded||'[LIST EXCLUDED ACTIVITIES OR LIMITS]',wording='';
 if(p==='none'){wording='You must complete this assessment without using generative AI tools to prepare or produce the submitted work. [Explain any relevant authorised exceptions or approved adjustments in the assessment instructions.]';permitted='[State any expressly authorised exceptions or approved adjustments.]';prohibited='Generative AI use to prepare or produce the submitted work, except for expressly authorised exceptions or approved adjustments.';}
 if(p==='limited')wording='You may use generative AI only for: '+permitted+'.\nYou may not use it for: '+prohibited+'.\nAny other AI use is not authorised unless expressly stated in these instructions.';
 if(p==='open')wording='You may use generative AI to support this assessment in the following ways: '+permitted+'.\nThe following limits apply: '+prohibited+'.\nYou are responsible for evaluating and checking AI-assisted content and for the submitted work.';
 if(p==='integral'){permitted=d.requirement||'[IDENTIFY THE TOOL OR SERVICE AND REQUIRED TASK]';wording='Required generative AI activity: '+permitted+'.\nExplain and evaluate its contribution in your submitted work as specified by the assessment brief. [State what evidence of evaluation is required and how it will be assessed under the approved criteria.]';}
 if(!wording)throw Error('Choose an approach or supply approved local wording.');
 return {wording,permitted,prohibited,declaration,usesLocalWording:false};
}
window.ToolkitAIWording=Object.freeze({draft});
})();