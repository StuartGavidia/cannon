import { BigInt, ipfs, json, log } from "@graphprotocol/graph-ts"
import {
  CannonRegistry,
  ProtocolPublish
} from "../generated/CannonRegistry/CannonRegistry"
import { Package, Tag, PackageTag } from "../generated/schema"

export function handleProtocolPublish(event: ProtocolPublish): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let id = event.params.name.toString() + "@" + event.params.version.toString();
  let entity = Package.load(id);

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new Package(id);
  }

  // Entity fields can be set based on event parameters
  entity.name = event.params.name.toString();
  entity.version = event.params.version.toString();
  entity.url = event.params.url;
  entity.added = event.block.timestamp;
  entity.publisher = event.transaction.from.toHexString();

  let metadata_path = entity.url.slice(7) + '/cache/cannonfile.json';
  let metadata_data = ipfs.cat(metadata_path);
  if(metadata_data) {
    let obj = json.fromBytes(metadata_data).toObject();
    let description = obj.get('description');
    if(description){
      entity.description = description.toString();
    }

    let tags = obj.get('tags');
    if(tags){
      let tagsArray = tags.toArray();
      for (let i = 0; i < tagsArray.length; ++i) {
        addTag(tagsArray[i].toString(), id);
      }
    }
  }

  let readme_path = entity.url.slice(7) + '/README.md';
  let readme_data = ipfs.cat(readme_path);
  if(readme_data) {
    entity.readme = readme_data.toString();
  }

  let toml_path = entity.url.slice(7) + '/cannonfile.toml';
  let toml_data = ipfs.cat(toml_path);
  if(toml_data) {
    entity.cannonfile = toml_data.toString();
  }

  entity.save();
}

function addTag(tagId:string, packageId:string): void{
  let entity = Tag.load(tagId);
  if (!entity) {
    entity = new Tag(tagId);
  }
  entity.count = entity.count.plus(BigInt.fromI32(1));
  entity.save();

  let join_entity = PackageTag.load(packageId + "-" + tagId);
  if (!join_entity) {
    join_entity = new PackageTag(packageId + "-" + tagId);
    join_entity.cannon_package = packageId;
    join_entity.tag = tagId;
    join_entity.save();
  }
}