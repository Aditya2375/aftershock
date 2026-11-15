package aftershock;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
/** Reads only the bundled, pinned wide-format price archive. */
public final class Dataset {
    public static double[] load(String ticker,String start,String end)throws Exception {
        if(!ticker.equals("AAPL")&&!ticker.equals("MSFT"))throw new IllegalArgumentException("Unknown archive ticker");
        var lines=Files.readAllLines(Path.of("data/prices.csv"));if(!lines.get(0).equals("date,AAPL,MSFT"))throw new IllegalArgumentException("Unexpected header");
        var out=new ArrayList<Double>();String previous="";int column=ticker.equals("AAPL")?1:2;
        for(String line:lines.subList(1,lines.size())){
            var fields=line.split(",",-1);if(fields.length!=3)throw new IllegalArgumentException("Three fields required");
            String date=LocalDate.parse(fields[0]).toString();if(date.compareTo(previous)<=0)throw new IllegalArgumentException("Dates not ordered");previous=date;
            double value=Double.parseDouble(fields[column]);if(!Double.isFinite(value)||value<=0)throw new IllegalArgumentException("Invalid price");
            if(date.compareTo(start)>=0&&date.compareTo(end)<=0)out.add(value);
        }
        return out.stream().mapToDouble(Double::doubleValue).toArray();
    }
}
