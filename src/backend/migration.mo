import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  type UserProfile = {
    name : Text;
  };

  type FileMetadata = {
    id : Text;
    owner : Principal.Principal;
    filename : Text;
    contentType : Text;
    size : Nat;
    arweaveId : Text;
    created : Time.Time;
    downloadCount : Int;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal.Principal, UserProfile>;
    uploads : Map.Map<Text, FileMetadata>;
  };

  type ChunkInfo = {
    size : Nat;
    chunkCount : Nat;
  };

  type FileChunk = {
    id : Text;
    chunkIndex : Nat;
    data : Blob;
    size : Nat;
    totalChunks : Nat;
  };

  type NewFileMetadata = {
    id : Text;
    owner : Principal.Principal;
    filename : Text;
    contentType : Text;
    size : Nat;
    uploaded : Time.Time;
    downloadCount : Int;
    isShared : Bool;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal.Principal, UserProfile>;
    uploads : Map.Map<Text, NewFileMetadata>;
    fileChunks : Map.Map<Text, List.List<FileChunk>>;
    chunkInfos : Map.Map<Text, ChunkInfo>;
  };

  public func run(old : OldActor) : NewActor {
    // Convert old FileMetadata to NewFileMetadata with isShared = false
    let newUploads = old.uploads.map<Text, FileMetadata, NewFileMetadata>(
      func(_id, oldMeta) {
        {
          id = oldMeta.id;
          owner = oldMeta.owner;
          filename = oldMeta.filename;
          contentType = oldMeta.contentType;
          size = oldMeta.size;
          uploaded = oldMeta.created;
          downloadCount = oldMeta.downloadCount;
          isShared = false;
        };
      }
    );
    // Initialize empty storage for fileChunks and chunkInfos
    { old with
      uploads = newUploads;
      fileChunks = Map.empty<Text, List.List<FileChunk>>();
      chunkInfos = Map.empty<Text, ChunkInfo>();
    };
  };
};
