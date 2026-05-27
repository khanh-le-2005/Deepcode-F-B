import { Banner } from '../models/Banner.js';
import { BadRequestError, NotFoundError } from '../utils/AppError.js';

class BannerService {
  /**
   * Lấy danh sách tất cả các banner
   */
  async getBanners() {
    return Banner.find().sort({ displayOrder: 1, createdAt: -1 });
  }

  /**
   * Lấy chi tiết banner theo ID
   */
  async getBannerById(id) {
    const banner = await Banner.findById(id);
    if (!banner) throw new NotFoundError('Banner not found');
    return banner;
  }

  /**
   * Lấy danh sách banner đang kích hoạt và còn hạn hiển thị
   */
  async getActiveBanners() {
    const now = new Date();
    return Banner.find({
      status: 'active',
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    }).sort({ displayOrder: 1, createdAt: -1 });
  }

  /**
   * Tạo mới banner
   */
  async createBanner(data) {
    if (!data.title || typeof data.title !== 'string') {
      throw new BadRequestError('Banner title is required');
    }
    if (!data.image || typeof data.image !== 'string') {
      throw new BadRequestError('Banner image is required');
    }

    // Cast displayOrder to number if sent as a string
    if (data.displayOrder !== undefined && data.displayOrder !== null) {
      data.displayOrder = Number(data.displayOrder);
      if (isNaN(data.displayOrder)) data.displayOrder = 0;
    }

    // Parse dates if sent as string
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const banner = new Banner(data);
    return banner.save();
  }

  /**
   * Cập nhật thông tin banner
   */
  async updateBanner(id, data) {
    // Cast displayOrder to number if sent as a string
    if (data.displayOrder !== undefined && data.displayOrder !== null) {
      data.displayOrder = Number(data.displayOrder);
      if (isNaN(data.displayOrder)) data.displayOrder = 0;
    }

    // Parse dates if sent as string
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const banner = await Banner.findByIdAndUpdate(id, data, { new: true });
    if (!banner) throw new NotFoundError('Banner not found');
    return banner;
  }

  /**
   * Xóa banner khỏi DB
   */
  async deleteBanner(id) {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) throw new NotFoundError('Banner not found');
    return banner;
  }
}

export default new BannerService();
