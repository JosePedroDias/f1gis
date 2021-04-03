## 1. find circuit in OSM

https://www.openstreetmap.org/search?query=autodromo%20estoril#map=16/38.7503/-9.3936

## 2. query filters, pick on it

https://www.openstreetmap.org/relation/11266675

## 3. Open JOSM, New > Download object

select relation
11266675

## 4. split into two ways, one for the track and another for the pit

- in the relations dialog, choose the relation we downloaded; right click select members

- in the selection dialog, click the triangle in the select button and choose select ways

- in the resulting list, choose all but the pit lane way; click on the select button

- menu tools > combine way; choose any conflicting values (we won't be using them) and apply


## 5. now let's edit the tags of each way...

select ways... remove pit from selection  
join ways and add:
- rt:kind track  
- rt:width (18, 14, etc.)  
- stroke (optional, a hex color)  
- oneway yes

select the pit way  
- rt:kind pit  
- rt:width (18, 14, etc.)  
- stroke (optional, a hex color)
- oneway yes

## 6. add checkpoits for zones and drs
