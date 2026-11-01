/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic canvas regression fixtures. */
'use strict';
const {createCanvas}=require('@napi-rs/canvas');
const families={gold:['#735323','#f2d78f','#c79c40','#735323'],green:['#164d25','#b3e3a6','#2c843e'],blue:['#152e6c','#619de8','#183a85'],gray:['#292929','#d5d5d5','#686868']};
function gradientArtwork(family='gold'){
 const c=createCanvas(480,280),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,480,280);
 const g=x.createLinearGradient(20,20,20,245),colors=families[family];colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));x.fillStyle=g;
 x.font='bold 54px serif';x.fillText('SOURCE',35,70);x.fillText('GRADIENT',20,150);x.font='bold 32px serif';x.fillText('SMALL LETTERS',65,230);
 // Detached geometry, a white hole and a tiny detached mark all belong to the
 // same source gradient. This is not the unavailable customer's exact logo.
 x.fillRect(385,25,50,210);x.fillRect(20,200,2,2);x.fillStyle='#fff';x.fillRect(400,70,18,35);return c;
}
function flatArtwork(colors=['#000080','#0000ff']){const c=createCanvas(480,280),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,480,280);colors.forEach((color,i)=>{x.fillStyle=color;x.fillRect(25+i*450/colors.length,30,390/colors.length,150);});return c;}
module.exports={gradientArtwork,flatArtwork};
