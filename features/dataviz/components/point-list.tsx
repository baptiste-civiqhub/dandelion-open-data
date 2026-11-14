/** Liste titrée de phrases courtes (points clés, points communs, différences) ; rien si la liste est vide. */
export function PointList({ title, points }: { title: string; points: readonly string[] }) {
  if (!points.length) return null
  return (
    <div className='flex flex-col gap-1'>
      <p className='text-muted-foreground text-xs font-medium'>{title}</p>
      <ul className='flex list-disc flex-col gap-1 pl-4'>
        {points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </div>
  )
}
