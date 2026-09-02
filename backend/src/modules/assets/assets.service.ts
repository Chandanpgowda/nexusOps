import { assetsRepository } from './assets.repository';
import { CreateAssetInput, ListAssetsQuery, UpdateAssetInput } from './assets.schemas';
import { AppError } from '../../lib/errors';
import { auditService } from '../audit/audit.service';

export class AssetsService {
  async create(data: CreateAssetInput, actorId: string) {
    const existingTag = await assetsRepository.findByTag(data.assetTag);
    if (existingTag) throw new AppError(409, 'ASSET_TAG_EXISTS', 'Asset tag already exists');

    const existingSerial = await assetsRepository.findBySerial(data.serialNumber);
    if (existingSerial) throw new AppError(409, 'SERIAL_EXISTS', 'Serial number already exists');

    const asset = await assetsRepository.create(data);

    await auditService.log({
      actorId,
      action: 'ASSET_CREATED',
      entityType: 'ASSET',
      entityId: asset.id,
      metadata: { assetTag: asset.assetTag, name: asset.name },
    });

    return asset;
  }

  async getById(id: string) {
    const asset = await assetsRepository.findById(id);
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');
    return asset;
  }

  async list(query: ListAssetsQuery) {
    return assetsRepository.list(query);
  }

  async update(id: string, data: UpdateAssetInput, actorId: string) {
    const existing = await assetsRepository.findById(id);
    if (!existing) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');

    if (data.assetTag && data.assetTag !== existing.assetTag) {
      const tagExists = await assetsRepository.findByTag(data.assetTag);
      if (tagExists) throw new AppError(409, 'ASSET_TAG_EXISTS', 'Asset tag already exists');
    }

    if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
      const serialExists = await assetsRepository.findBySerial(data.serialNumber);
      if (serialExists) throw new AppError(409, 'SERIAL_EXISTS', 'Serial number already exists');
    }

    const asset = await assetsRepository.update(id, data);

    await auditService.log({
      actorId,
      action: 'ASSET_UPDATED',
      entityType: 'ASSET',
      entityId: id,
      metadata: { changes: Object.keys(data) },
    });

    return asset;
  }

  async delete(id: string, actorId: string) {
    const existing = await assetsRepository.findById(id);
    if (!existing) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');

    await assetsRepository.delete(id);

    await auditService.log({
      actorId,
      action: 'ASSET_DELETED',
      entityType: 'ASSET',
      entityId: id,
      metadata: { assetTag: existing.assetTag },
    });
  }

  async assign(assetId: string, toUserId: string | null, note: string | undefined, actorId: string) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');

    await assetsRepository.addAssignment(assetId, asset.assignedUserId, toUserId, note);
    const updated = await assetsRepository.update(assetId, { assignedUserId: toUserId ?? undefined, status: toUserId ? 'IN_USE' : 'IN_STOCK' });

    await auditService.log({
      actorId,
      action: 'ASSET_ASSIGNED',
      entityType: 'ASSET',
      entityId: assetId,
      metadata: { from: asset.assignedUserId, to: toUserId },
    });

    return updated;
  }

  async getAssignmentHistory(assetId: string) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');
    return assetsRepository.getAssignmentHistory(assetId);
  }
}

export const assetsService = new AssetsService();
