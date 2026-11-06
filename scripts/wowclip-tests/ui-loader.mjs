import { registerHooks,createRequire } from 'node:module';
import { fileURLToPath,pathToFileURL } from 'node:url';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
const repo=process.cwd(), appRequire=createRequire(path.join(repo,'package.json'));
const runtimeRequire=createRequire(path.join(process.env.WOWCLIP_TEST_RUNTIME,'package.json'));
const babel=appRequire('@babel/core'), jsx=runtimeRequire('@babel/plugin-transform-react-jsx');
const modules=new Map(['react','react/jsx-runtime','react/jsx-dev-runtime'].map(name=>[name,pathToFileURL(appRequire.resolve(name)).href]));
modules.set('react-test-renderer',pathToFileURL(runtimeRequire.resolve('react-test-renderer')).href);
const special=(url,suffix)=>url.startsWith('file:')&&fileURLToPath(url).replaceAll('\\','/').endsWith(suffix);
registerHooks({resolve(specifier,context,next){
 if(process.env.WOWCLIP_TEST_REAL_PLAYER==='1'&&specifier==='react-youtube')return{url:'wowclip:test-youtube',shortCircuit:true};
 if(modules.has(specifier))return{url:modules.get(specifier),shortCircuit:true};
 if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){
  const base=fileURLToPath(new URL(specifier,context.parentURL));
  if(!path.extname(base))for(const ext of ['.js','.jsx'])if(existsSync(base+ext))return{url:pathToFileURL(base+ext).href,shortCircuit:true};
 }
 return next(specifier,context);
},load(url,context,next){
 if(url==='wowclip:test-youtube')return{format:'module',source:"import {createElement} from 'react';export default function YouTube(props){globalThis.__wowPlayerProps=props;return createElement('iframe');}",shortCircuit:true};
 if(url.endsWith('.scss')||url.endsWith('.css'))return{format:'module',source:'export {};',shortCircuit:true};
 if(special(url,'/src/firebase/firebase.js'))return{format:'module',source:'export const auth={currentUser:null}; export const db={};export const googleProvider={};',shortCircuit:true};
 if(special(url,'/src/service/wowClipService.js'))return{format:'module',source:'export const wowClipService=globalThis.__wowUiService;',shortCircuit:true};
 if(special(url,'/src/service/wowClipCommentService.js'))return{format:'module',source:'export const subscribeClipComments=(...args)=>globalThis.__wowLegacyComments.subscribe(...args);export const createClipComment=(...args)=>globalThis.__wowLegacyComments.create(...args);export const deleteClipComment=(...args)=>globalThis.__wowLegacyComments.remove(...args);',shortCircuit:true};
 if(special(url,'/src/page/wowclip/components/WowClipUi.jsx'))return{format:'module',source:"import {createElement} from 'react';export const ClipIcon=()=>null;export const ClipSort=()=>null;export const IconButton=({label,...props})=>createElement('button',{'aria-label':label,...props});export const ClipModal=({title,children})=>createElement('section',{'aria-label':title},children);",shortCircuit:true};
 if(special(url,'/src/page/wowclip/components/ClipPlayer.jsx')&&process.env.WOWCLIP_TEST_REAL_PLAYER!=='1')return{format:'module',source:"import {useEffect} from 'react';export const ClipPlayer=({onDuration})=>{useEffect(()=>{onDuration?.(20)},[]);return null};",shortCircuit:true};
 if(url.endsWith('.jsx'))return{format:'module',source:babel.transformSync(readFileSync(fileURLToPath(url),'utf8'),{filename:fileURLToPath(url),configFile:false,babelrc:false,plugins:[[jsx,{runtime:'automatic'}]]}).code,shortCircuit:true};
 return next(url,context);
}});
