import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FileChunk {
    id: string;
    chunkIndex: bigint;
    data: Uint8Array;
    size: bigint;
    totalChunks: bigint;
}
export interface ChunkInfo {
    size: bigint;
    chunkCount: bigint;
}
export type Time = bigint;
export interface FileMetadata {
    id: string;
    contentType: string;
    owner: Principal;
    size: bigint;
    isShared: boolean;
    filename: string;
    uploaded: Time;
    downloadCount: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteFile(id: string): Promise<void>;
    finalizeUpload(id: string): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChunkInfo(id: string): Promise<ChunkInfo | null>;
    getFileChunks(id: string): Promise<Array<FileChunk>>;
    getMyUploads(): Promise<Array<FileMetadata>>;
    getTotalUploads(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserUploadCount(user: Principal): Promise<bigint>;
    incrementDownloadCount(id: string): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isFileShared(id: string): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    shareFile(id: string): Promise<void>;
    uploadChunk(id: string, chunk: FileChunk): Promise<void>;
    uploadFileMetadata(filename: string, contentType: string, size: bigint, chunkCount: bigint): Promise<string>;
}
