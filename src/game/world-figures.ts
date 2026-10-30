/** Small world-space figures, distinct from the strategic counters. */
export function drawFormation(c:CanvasRenderingContext2D,x:number,y:number,size:number,naval:boolean,hostile:boolean,active:boolean,moving:boolean,progress:number,role:string){
 c.save();c.translate(x,y);c.strokeStyle=active?'#f8d77b':hostile?'#d89175':'#d6dfbf';c.fillStyle=hostile?'#65483a':'#52634b';c.lineWidth=1.5;
 if(naval){
  c.beginPath();c.moveTo(0,-size*.9);c.lineTo(size*.3,-size*.35);c.lineTo(size*.3,size*.65);c.lineTo(-size*.3,size*.65);c.lineTo(-size*.3,-size*.35);c.closePath();c.fill();c.stroke();
  c.fillStyle='#a2aaa0';c.fillRect(-size*.15,-size*.25,size*.3,size*.5);c.fillStyle='#384744';c.fillRect(-size*.07,-size*.55,size*.14,size*.2);
  if(moving){c.strokeStyle='#bad5d680';for(let i=0;i<3;i++){const p=(progress+i/3)%1;c.beginPath();c.moveTo(-size*(.3+p*.5),size*(.8+p));c.lineTo(0,size*(.6+p));c.lineTo(size*(.3+p*.5),size*(.8+p));c.stroke();}}
 }else{
  for(let i=0;i<3;i++){const px=(i-1)*size*.55,py=i===1?-size*.25:size*.1;const step=moving?Math.sin(progress*Math.PI*8+i)*size*.08:0;
   c.fillStyle=hostile?'#625347':'#526447';c.beginPath();c.ellipse(px,py+size*.08,size*.18,size*.27,0,0,Math.PI*2);c.fill();c.stroke();
   c.fillStyle='#87916e';c.beginPath();c.arc(px,py-size*.2,size*.17,0,Math.PI*2);c.fill();
   c.strokeStyle='#313c2e';c.beginPath();c.moveTo(px-size*.09,py+size*.2);c.lineTo(px-size*.12+step,py+size*.4);c.moveTo(px+size*.09,py+size*.2);c.lineTo(px+size*.12-step,py+size*.4);c.stroke();
  }
  if(/Comando/.test(role)){c.strokeStyle='#e9c77f';c.beginPath();c.moveTo(size*.85,size*.3);c.lineTo(size*.85,-size*.6);c.lineTo(size*1.2,-size*.4);c.lineTo(size*.85,-size*.25);c.stroke();}
 }
 if(active){c.strokeStyle='#edca7b';c.beginPath();c.ellipse(0,size*.7,size, size*.24,0,0,Math.PI*2);c.stroke();}
 c.restore();
}
export function drawAircraft(c:CanvasRenderingContext2D,x:number,y:number,size:number){
 c.save();c.translate(x,y);c.fillStyle='#a8b0a0';c.strokeStyle='#343f38';c.lineWidth=1;
 c.beginPath();c.moveTo(0,-size);c.lineTo(size*.13,-size*.15);c.lineTo(size*.9,size*.2);c.lineTo(size*.9,size*.4);c.lineTo(size*.13,size*.25);c.lineTo(size*.12,size*.7);c.lineTo(size*.4,size*.85);c.lineTo(-size*.4,size*.85);c.lineTo(-size*.12,size*.7);c.lineTo(-size*.13,size*.25);c.lineTo(-size*.9,size*.4);c.lineTo(-size*.9,size*.2);c.lineTo(-size*.13,-size*.15);c.closePath();c.fill();c.stroke();c.restore();
}
