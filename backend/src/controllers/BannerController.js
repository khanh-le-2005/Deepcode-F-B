import BannerService from '../services/BannerService.js';
import ImageService from '../services/ImageService.js';
import { catchAsync } from "../utils/catchAsync.js";

export const getBanners = catchAsync(async (req, res) => {
  const banners = await BannerService.getBanners();
  res.json(banners);
});

export const getActiveBanners = catchAsync(async (req, res) => {
  const banners = await BannerService.getActiveBanners();
  res.json(banners);
});

export const getBannerById = catchAsync(async (req, res) => {
  const banner = await BannerService.getBannerById(req.params.id);
  res.json(banner);
});

export const createBanner = catchAsync(async (req, res) => {
  let bannerData = req.body;

  // Nếu client gửi JSON Text qua form-data với key "data"
  if (req.body.data && typeof req.body.data === 'string') {
    bannerData = JSON.parse(req.body.data);
  }

  // Nếu client gửi file đính kèm (single image)
  if (req.file) {
    const savedImage = await ImageService.saveImage(req.file);
    bannerData.image = String(savedImage.id); // Lưu ID ảnh dưới dạng chuỗi
  }

  const banner = await BannerService.createBanner(bannerData);
  res.status(201).json(banner);
});

export const updateBanner = catchAsync(async (req, res) => {
  let bannerData = req.body;

  if (req.body.data && typeof req.body.data === 'string') {
    bannerData = JSON.parse(req.body.data);
  }

  // Nếu cập nhật kèm theo hình mới
  if (req.file) {
    const savedImage = await ImageService.saveImage(req.file);
    bannerData.image = String(savedImage.id);
  }

  const banner = await BannerService.updateBanner(req.params.id, bannerData);
  res.json(banner);
});

export const deleteBanner = catchAsync(async (req, res) => {
  await BannerService.deleteBanner(req.params.id);
  res.json({ message: 'Banner deleted successfully' });
});
