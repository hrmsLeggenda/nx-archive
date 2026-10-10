export function entityForName(graph,kind,name){return graph.entities.find(e=>e.kind===kind&&(e.name===name||e.aliases.includes(name)))}
export function relatedEntities(graph,id){
 const ids=new Set(graph.edges.filter(e=>e.from===id||e.to===id).map(e=>e.from===id?e.to:e.from))
 return graph.entities.filter(e=>ids.has(e.id))
}
