import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import ExternalBlob "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  public type UserProfile = {
    name : Text;
  };

  public type FileMetadata = {
    id : Text;
    owner : Principal;
    filename : Text;
    contentType : Text;
    size : Nat;
    uploaded : Time.Time;
    downloadCount : Int;
    isShared : Bool;
  };

  public type ChunkInfo = {
    size : Nat;
    chunkCount : Nat;
  };

  public type FileChunk = {
    id : Text;
    chunkIndex : Nat;
    data : Blob;
    size : Nat;
    totalChunks : Nat;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let uploads = Map.empty<Text, FileMetadata>();
  let fileChunks = Map.empty<Text, List.List<FileChunk>>();
  let chunkInfos = Map.empty<Text, ChunkInfo>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func uploadFileMetadata(
    filename : Text,
    contentType : Text,
    size : Nat,
    chunkCount : Nat,
  ) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must log in to upload files");
    };

    let id = filename # "_" # Time.now().toText();
    let metadata : FileMetadata = {
      id;
      owner = caller;
      filename;
      contentType;
      size;
      uploaded = Time.now();
      downloadCount = 0;
      isShared = false;
    };

    uploads.add(id, metadata);
    chunkInfos.add(id, { size; chunkCount });
    id;
  };

  public shared ({ caller }) func uploadChunk(id : Text, chunk : FileChunk) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must log in to upload files");
    };

    switch (uploads.get(id)) {
      case (?meta) {
        if (meta.owner != caller) {
          Runtime.trap("Unauthorized: You do not own this file");
        };

        let currentChunks = switch (fileChunks.get(id)) {
          case (?chunks) { chunks };
          case (null) { List.empty<FileChunk>() };
        };
        currentChunks.add(chunk);
        fileChunks.add(id, currentChunks);
      };
      case (null) { Runtime.trap("File metadata not found") };
    };
  };

  public shared ({ caller }) func finalizeUpload(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must log in to finalize uploads");
    };

    switch (uploads.get(id)) {
      case (?meta) {
        if (meta.owner != caller) {
          Runtime.trap("Unauthorized: You do not own this file");
        };
        switch (fileChunks.get(id)) {
          case (?chunks) {
            let totalSize = chunks.values().foldLeft(0, func(acc, chunk) { acc + chunk.data.size() });

            if (totalSize != meta.size) {
              Runtime.trap("Incomplete upload: File size mismatch");
            };
          };
          case (null) {
            Runtime.trap("No uploaded chunks found");
          };
        };
      };
      case (null) { Runtime.trap("File metadata not found") };
    };
  };

  public query ({ caller }) func getMyUploads() : async [FileMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must log in to view your uploads");
    };
    uploads.values().toArray().filter(func(meta) { meta.owner == caller });
  };

  public query ({ caller }) func getFileChunks(id : Text) : async [FileChunk] {
    let meta = switch (uploads.get(id)) {
      case (?meta) { meta };
      case (null) { Runtime.trap("File not found") };
    };
    
    // For private files, require authentication and ownership
    if (not meta.isShared) {
      if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
        Runtime.trap("Unauthorized: You must log in to access private files");
      };
      if (meta.owner != caller) {
        Runtime.trap("Unauthorized: Private file");
      };
    };

    switch (fileChunks.get(id)) {
      case (?chunks) { chunks.toArray() };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func shareFile(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must log in to share files");
    };

    switch (uploads.get(id)) {
      case (?meta) {
        if (meta.owner != caller) {
          Runtime.trap("Unauthorized: You do not own this file");
        };
        let updatedMeta = {
          meta with
          isShared = true;
        };
        uploads.add(id, updatedMeta);
      };
      case (null) { Runtime.trap("File not found") };
    };
  };

  public shared ({ caller }) func deleteFile(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must log in to delete files");
    };

    switch (uploads.get(id)) {
      case (?meta) {
        if (meta.owner != caller) {
          Runtime.trap("Unauthorized: You can only delete your own files");
        };
        uploads.remove(id);
        fileChunks.remove(id);
        chunkInfos.remove(id);
      };
      case (null) { Runtime.trap("File not found") };
    };
  };

  public shared ({ caller }) func incrementDownloadCount(id : Text) : async () {
    switch (uploads.get(id)) {
      case (?meta) {
        // Only allow incrementing download count for shared files or by the owner
        if (not meta.isShared and meta.owner != caller) {
          Runtime.trap("Unauthorized: Cannot track downloads for private files");
        };
        
        let updatedMeta = {
          meta with
          downloadCount = meta.downloadCount + 1;
        };
        uploads.add(id, updatedMeta);
      };
      case (null) { Runtime.trap("File not found") };
    };
  };

  public query ({ caller }) func getChunkInfo(id : Text) : async ?ChunkInfo {
    switch (uploads.get(id)) {
      case (?meta) {
        // For private files, require authentication and ownership
        if (not meta.isShared) {
          if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: You must log in to access private file info");
          };
          if (meta.owner != caller) {
            Runtime.trap("Unauthorized: Private file");
          };
        };
        chunkInfos.get(id);
      };
      case (null) { Runtime.trap("File not found") };
    };
  };

  public query func isFileShared(id : Text) : async Bool {
    switch (uploads.get(id)) {
      case (?meta) { meta.isShared };
      case (null) { false };
    };
  };

  public query func getTotalUploads() : async Nat {
    uploads.size();
  };

  public query ({ caller }) func getUserUploadCount(user : Principal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access this info");
    };
    let uploadsArray = uploads.values().toArray();
    var count : Nat = 0;
    for (meta in uploadsArray.values()) {
      if (meta.owner == user) {
        count += 1;
      };
    };
    count;
  };
};
