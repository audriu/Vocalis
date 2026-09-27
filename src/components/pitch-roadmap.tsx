import Link from 'next/link';
import { Trophy, Clock3, Lock, ArrowRight } from 'lucide-react';
const lengths=[{time:'1 min',label:'Elevator pitch'},{time:'3 min',label:'Hackathon pitch'},{time:'5 min',label:'Pitch + demo walkthrough'},{time:'10+ min',label:'Extended presentation',pro:true}];
const focus=['Problem & solution clarity','Hook → problem → solution → demo → impact','Pacing against the clock','Confidence & filler words'];
export default function PitchRoadmap(){
 return <section className="panel pitch-roadmap" aria-labelledby="pitch-roadmap-title"><div className="pitch-roadmap-head"><span className="icon-box orange"><Trophy size={19}/></span><div style={{flex:1}}><div className="pitch-roadmap-tags"><span className="pitch-soon" style={{background:'#e0f2fe',color:'#0369a1'}}>Live Mode</span><span>AssemblyAI Voice Agent Hackathon</span></div><h2 id="pitch-roadmap-title">Hackathon Pitch Training</h2><p>Pitch your own project idea like you’re in front of the judges. Describe what you’re building, set the clock, and get feedback built for pitching.</p><div style={{marginTop:'12px'}}><Link href="/practice/hackathon-pitch" style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'7px 15px',fontSize:'12px',borderRadius:'6px',textDecoration:'none',background:'var(--orange,#ea580c)',color:'#fff',fontWeight:600}}>Start Pitch Practice <ArrowRight size={13}/></Link></div></div></div>
 <div className="pitch-lengths">{lengths.map(l=><div key={l.time} className={`pitch-length ${l.pro?'pro':''}`}><strong><Clock3 size={13}/>{l.time}{l.pro&&<span className="pitch-pro"><Lock size={9}/>Pro</span>}</strong><small>{l.label}</small></div>)}</div>
 <ul className="pitch-focus">{focus.map(f=><li key={f}>{f}</li>)}</ul></section>;
}
