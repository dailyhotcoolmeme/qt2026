import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    // 우리가 만든 'simple' 인덱스를 활용한 고속 검색
    const { data, error } = await supabase
      .from('bible_verses')
      .select('*')
      .textSearch('content', keyword, {
        config: 'simple',
        type: 'phrase' // 정확한 단어 뭉치 검색
      })
      .limit(50); // 너무 많으면 느려지니 50개만 우선 출력

    if (error) console.error(error);
    else setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="p-4 bg-white min-h-screen">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="검색어를 입력하세요 (예: 사랑, 믿음)"
            className="flex-1 border p-2 rounded-lg outline-none focus:border-blue-500"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">검색</button>
        </div>
      </form>

      {loading && <p className="text-center">검색 중...</p>}

      <div className="space-y-4">
        {results.map((verse) => (
          <div key={verse.id} className="border-b pb-2 cursor-pointer hover:bg-gray-50">
            <p className="text-sm font-bold text-blue-600">
              {verse.book_name} {verse.chapter}:{verse.verse}
            </p>
            <p className="text-gray-800">{verse.content}</p>
          </div>
        ))}
        {!loading && results.length === 0 && keyword && (
          <p className="text-center text-gray-400 mt-10">검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
