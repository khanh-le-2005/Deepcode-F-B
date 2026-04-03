export const globalSchemaOptions = {
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      if (ret._id != null) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
    }
  },
  toObject: {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      if (ret._id != null) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
    }
  },
  timestamps: true
};
