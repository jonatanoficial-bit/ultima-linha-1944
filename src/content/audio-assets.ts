/** Set src to a repository-relative file when a recording is delivered. Null = procedural fallback. */
export const AUDIO_ASSETS: Record<string,{src:string|null;gain:number;loop:boolean}> = {
 army:{src:null,gain:.25,loop:true},air:{src:null,gain:.25,loop:true},navy:{src:null,gain:.25,loop:true},
 radio:{src:null,gain:.45,loop:false},move:{src:null,gain:.3,loop:false},work:{src:null,gain:.3,loop:false},contact:{src:null,gain:.4,loop:false}
};
