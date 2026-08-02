export interface Photo {
  id: string;
  url: string;
  type?: 'image' | 'video';
}

export interface Album {
  id: string;
  title: string;
  category: string;
  price: number;
  coverImage: string;
  code: string;
  photos: Photo[];
}

export interface Settings {
  donationEmail: string;
}
