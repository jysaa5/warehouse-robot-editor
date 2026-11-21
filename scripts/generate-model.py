"""Create an original, meter-scale AMR GLB using box geometry; no external assets."""
import json, struct, pathlib
positions=[]; normals=[]; indices=[]
# Each face has independent vertices for flat normals.
faces=[([1,0,0],[(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)]),([-1,0,0],[(-1,-1,1),(-1,1,1),(-1,1,-1),(-1,-1,-1)]),([0,1,0],[(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)]),([0,-1,0],[(-1,-1,1),(-1,-1,-1),(1,-1,-1),(1,-1,1)]),([0,0,1],[(1,-1,1),(1,1,1),(-1,1,1),(-1,-1,1)]),([0,0,-1],[(-1,-1,-1),(-1,1,-1),(1,1,-1),(1,-1,-1)])]
for n,vs in faces:
    start=len(positions)//3
    for v in vs: positions.extend(v); normals.extend(n)
    indices.extend([start,start+1,start+2,start,start+2,start+3])
p=struct.pack('<72f',*positions); n=struct.pack('<72f',*normals); i=struct.pack('<36H',*indices); binary=p+n+i
parts=[('Body',[0,.28,0],[.48,.18,.65],0),('Deck',[0,.49,0],[.43,.03,.59],1),('Left wheel',[-.49,.13,0],[.06,.13,.23],2),('Right wheel',[.49,.13,0],[.06,.13,.23],2),('Front +Z',[0,.31,.656],[.26,.045,.015],3),('Sensor',[0,.57,.28],[.09,.05,.09],2)]
doc={'asset':{'version':'2.0','generator':'warehouse-robot-editor original model'},'scene':0,'scenes':[{'nodes':list(range(len(parts)))}],'nodes':[{'name':name,'mesh':mat,'translation':pos,'scale':scale} for name,pos,scale,mat in parts],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2,'material':j}]} for j in range(4)],'materials':[{'pbrMetallicRoughness':{'baseColorFactor':c,'metallicFactor':.15,'roughnessFactor':.65}} for c in [[.1,.65,.61,1],[.75,.84,.87,1],[.035,.05,.07,1],[1,.65,.12,1]]],'buffers':[{'byteLength':len(binary)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(p)},{'buffer':0,'byteOffset':len(p),'byteLength':len(n)},{'buffer':0,'byteOffset':len(p)+len(n),'byteLength':len(i)}],'accessors':[{'bufferView':0,'componentType':5126,'count':24,'type':'VEC3','min':[-1,-1,-1],'max':[1,1,1]},{'bufferView':1,'componentType':5126,'count':24,'type':'VEC3'},{'bufferView':2,'componentType':5123,'count':36,'type':'SCALAR'}]}
j=json.dumps(doc,separators=(',',':')).encode(); j+=b' '*((-len(j))%4); binary+=b'\0'*((-len(binary))%4)
out=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
pathlib.Path('public/models/warehouse-amr.glb').write_bytes(out)
