export function parsePages(pages){
 let category=null,rows=[],headers=[],expected=0,hasCount=false,unknown=[];
 for(const page of pages){
 const items=page.items.filter(i=>i.str?.trim()).map(i=>({text:i.str.trim(),x:i.transform[4]/page.width,y:i.transform[5]}));
 const lines=[];for(const it of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){let l=lines.find(l=>Math.abs(l.y-it.y)<2);if(!l){l={y:it.y,items:[]};lines.push(l);}l.items.push(it);}lines.forEach(l=>{l.items.sort((a,b)=>a.x-b.x);l.text=l.items.map(i=>i.text).join(' ');});
 const head=lines.find(l=>l.items.some(i=>/^\d{2}\/\d{2}\/\d{4}$/.test(i.text)));
 if(head){const date=head.items.find(i=>i.x>.4&&i.x<.56&&/^\d{2}\/\d{2}\/\d{4}$/.test(i.text))?.text;const plate=head.items.filter(i=>i.x>.29&&i.x<.43).map(i=>i.text).join('');const trip=head.items.filter(i=>i.x>.19&&i.x<.29).map(i=>i.text).join('');if(date&&plate)headers.push({date,plate,trip});}
 const codes=items.filter(i=>i.x>.44&&i.x<.58&&/^\d{3,10}$/.test(i.text)&&i.y<page.height-90&&i.y>95).sort((a,b)=>b.y-a.y);
 for(const l of lines){
 const label=l.items.filter(i=>i.x<.4).map(i=>i.text).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 if(/^(Productos|Vacios|Bloqueados|Activos)$/.test(label)){category=label==='Productos'?'Líquido':label==='Vacios'?'Envases':label;const c=l.text.match(/(\d+)\s+Inconsistencias/i);if(c){expected+=Number(c[1]);hasCount=true;}}
 const code=codes.find(c=>Math.abs(c.y-l.y)<2);if(!code)continue;
 const nearby=items.filter(i=>Math.abs(i.y-code.y)<8);
 const name=nearby.filter(i=>i.x<.44).sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ');
 const qty=nearby.filter(i=>i.x>.64&&i.x<.75).sort((a,b)=>b.y-a.y||a.x-b.x).map(i=>i.text).join('').replace(/\s/g,'');
 const m=qty.match(/^(\d+)\/(\d+)$/);if(!m||!name||!category){unknown.push(code.text);continue;}
 const delivered=Number(m[1]),system=Number(m[2]);if(!Number.isSafeInteger(delivered)||!Number.isSafeInteger(system)){unknown.push(code.text);continue;}if(delivered!==system)rows.push({category,code:code.text,product:name,quantity:delivered-system,delivered,system});
 }
 }
 if(!headers.length)throw new Error('No se pudo leer la fecha de entrega o la placa. Usa una liquidación con el mismo formato del ejemplo y texto seleccionable.');
 if(headers.some(h=>JSON.stringify(h)!==JSON.stringify(headers[0])))throw new Error('Este PDF contiene viajes o cabeceras diferentes. Separa las liquidaciones antes de cargarlas.');
 if(unknown.length)throw new Error('No se pudieron interpretar todas las cantidades (códigos '+unknown.join(', ')+'). Revisa el PDF; no se guardará una lectura incompleta.');
 if(!hasCount||rows.length!==expected)throw new Error('No coinciden las diferencias leídas ('+rows.length+') con las inconsistencias del PDF ('+expected+'). Revisa el formato antes de guardar.');
 if(rows.some(r=>!['Líquido','Envases'].includes(r.category)))throw new Error('Hay diferencias en Bloqueados o Activos. Este reporte está configurado para Productos y Vacíos.');
 return {...headers[0],rows};
}
